---
title: Lab 5 Down the stack (the network interface)
toc: true
date: 2025-12-30 11:01:28
tags:
categories:
  - 公开课
  - CS144
  - Labs
---

在这个 lab 里，我们要把第二层链路层和第三层网络层连接起来，实现一个能让同一子网下的主机通信的接口。在出站方向，我们的代码将 IP 包封装为 ETH 帧，并视情况发起 ARP 请求以维护 IP 到 MAC 的映射表；在入站方向，我们把 ETH 帧解析为 IP 包并向上传递，或解析为 ARP 协议包并更新 ARP 表。

我们要维护 ARP 表和“想要发送但尚不知道目标 MAC 地址的包”列表，并在一定时间后让它们过期。所以我们在头文件里新增以下字段：

```cpp
class NetworkInterface
{
public:
  // ...
private:
  // ...
  static constexpr size_t ARP_TTL = 30000;
  static constexpr size_t ARP_SAME_REQUEST_CD = 5000;
  
  // Datagrams to send. We store datagrams whose next hop's MAC is still unknown here.
  struct PendingArpRequest
  {
    std::vector<InternetDatagram> buffered_datagrams {};
    size_t ms_since_last_request {
      SIZE_MAX }; // Init to max so the first request is not limited by ARP_SAME_REQUEST_CD.
  };
  // Mapping ip to pending arp request
  std::unordered_map<uint32_t, PendingArpRequest> pending_arp_requests_ {};

  struct ArpEntry
  {
    EthernetAddress eth_addr {};
    size_t living_ms { 0 };
  };
  // Table mapping IP to MAC and living time
  std::unordered_map<uint32_t, ArpEntry> arp_table_ {};
};
```

在出站方向，如果已经知道下一跳对应的 MAC 地址，直接发送就行；如果不知道就要把想要出站的数据存储起来并广播 ARP 请求。注意对同一个 IP 的 ARP 请求不应太频繁，如实验文档所说我们可以设置一个五秒的 CD.

这里的 serialize 函数是一个辅助函数，用于把数据转换成二进制序列。在 InternetDatagram 这些类内部内存不一定连续（比如 `std::vector<Refstd::string> payload {}`），也可能有大小端问题，serialize 则处理这些问题把它们转化成连续的、网络序的字节流。

这里的 transmit 则是对主机的物理发信能力的抽象。

```cpp
void NetworkInterface::send_datagram( InternetDatagram dgram, const Address& next_hop )
{
  EthernetFrame eth_frame {};
  eth_frame.header.src = ethernet_address_;

  if ( arp_table_.contains( next_hop.ipv4_numeric() ) && arp_table_[next_hop.ipv4_numeric()].living_ms < ARP_TTL ) {
    // Send datagram right away if the dst eth address is already known
    eth_frame.header.dst = arp_table_[next_hop.ipv4_numeric()].eth_addr;
    eth_frame.header.type = EthernetHeader::TYPE_IPv4;

    eth_frame.payload = serialize( dgram );
  } else {
    pending_arp_requests_[next_hop.ipv4_numeric()].buffered_datagrams.push_back( std::move( dgram ) );

    // Send ARP request if last ARP request with same IP was more than ARP_SAME_REQUEST_CD ago
    if ( pending_arp_requests_[next_hop.ipv4_numeric()].ms_since_last_request < ARP_SAME_REQUEST_CD ) {
      return;
    }
    eth_frame.header.dst = ETHERNET_BROADCAST;
    eth_frame.header.type = EthernetHeader::TYPE_ARP;

    ARPMessage arpmsg;
    arpmsg.opcode = ARPMessage::OPCODE_REQUEST;
    arpmsg.sender_ethernet_address = ethernet_address_;
    arpmsg.sender_ip_address = ip_address_.ipv4_numeric();
    arpmsg.target_ethernet_address = ETHERNET_ZERO;
    arpmsg.target_ip_address = next_hop.ipv4_numeric();

    eth_frame.payload = serialize( arpmsg );
    pending_arp_requests_[next_hop.ipv4_numeric()].ms_since_last_request = 0;
  }

  transmit( eth_frame );
}
```

在入站方向，接收到 ETH 帧时做个 Multiplexing 分成 IPV4 和 ARP 两个分支，遇到 IPV4 就放进 datagrams_received_ 给上层应用；遇到 ARP 先结合其 sender 的 IP 和 MAC 信息更新 ARP 表、发缓存的包（如果有），再根据类型判断是否回复。

```cpp
void NetworkInterface::recv_frame( const EthernetFrame& frame )
{
  if ( frame.header.dst != ethernet_address_ && frame.header.dst != ETHERNET_BROADCAST ) {
    return;
  }
  if ( frame.header.type == EthernetHeader::TYPE_IPv4 ) {
    InternetDatagram dgram;
    if ( parse( dgram, frame.payload ) ) {
      datagrams_received_.push( dgram );
    } else {
      debug( "recv_frame: Parse failed!" );
    }
  } else if ( frame.header.type == EthernetHeader::TYPE_ARP ) {
    ARPMessage arpmsg;
    if ( parse( arpmsg, frame.payload ) ) {
      arp_table_[arpmsg.sender_ip_address] = { arpmsg.sender_ethernet_address, 0 };

      // Send datagrams whose next hop's MAC was unknown but is known now.
      if ( pending_arp_requests_.contains( arpmsg.sender_ip_address ) ) {
        for ( const auto& dgram : pending_arp_requests_[arpmsg.sender_ip_address].buffered_datagrams ) {
          EthernetFrame eth_frame;
          eth_frame.header.src = ethernet_address_;
          eth_frame.header.dst = arp_table_[arpmsg.sender_ip_address].eth_addr;
          eth_frame.header.type = EthernetHeader::TYPE_IPv4;

          eth_frame.payload = serialize( dgram );
          transmit( eth_frame );
        }
      }
      pending_arp_requests_.erase( arpmsg.sender_ip_address );

      // Send ARP reply if it is an ARP request asking for our IP address
      if ( arpmsg.opcode == ARPMessage::OPCODE_REQUEST && arpmsg.target_ip_address == ip_address_.ipv4_numeric() ) {
        EthernetFrame eth_frame {};
        eth_frame.header.src = ethernet_address_;
        eth_frame.header.dst = arpmsg.sender_ethernet_address;
        eth_frame.header.type = EthernetHeader::TYPE_ARP;

        ARPMessage arpreply;
        arpreply.opcode = ARPMessage::OPCODE_REPLY;
        arpreply.sender_ethernet_address = ethernet_address_;
        arpreply.sender_ip_address = ip_address_.ipv4_numeric();
        arpreply.target_ethernet_address = arpmsg.sender_ethernet_address;
        arpreply.target_ip_address = arpmsg.sender_ip_address;

        eth_frame.payload = serialize( arpreply );
        transmit( eth_frame );
      }
    } else {
      debug( "recv_frame: Parse failed!" );
    }
  }
}
```

最后是 tick 函数，它更新大家的计时器然后在到期时 erase 就行。注意别把边遍历边 erase 的逻辑写错了。

```cpp
void NetworkInterface::tick( const size_t ms_since_last_tick )
{
  for ( auto it = pending_arp_requests_.begin(); it != pending_arp_requests_.end(); ) {
    auto& [ip, pending_arp_request] = *it;
    pending_arp_request.ms_since_last_request += ms_since_last_tick;
    if ( pending_arp_request.ms_since_last_request > ARP_SAME_REQUEST_CD ) {
      it = pending_arp_requests_.erase( it );
    } else {
      ++it;
    }
  }

  for ( auto it = arp_table_.begin(); it != arp_table_.end(); ) {
    auto& [ip, arp_entry] = *it;
    arp_entry.living_ms += ms_since_last_tick;
    if ( arp_entry.living_ms > ARP_TTL ) {
      it = arp_table_.erase( it );
    } else {
      ++it;
    }
  }
}
```