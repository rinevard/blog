---
title: Lab 6 Building an IP router
toc: true
date: 2025-12-31 12:38:28
tags:
categories:
  - 公开课
  - CS144
  - Labs
---

在这个 Lab 里我们要实现按转发表转发数据报的方法。我们不需要实现构造转发表的算法，也不需要用前缀树来快速查询转发表，所以实现起来不算难。

转发表需要对给定的 IP 给出下一跳的 IP 和对应的出接口/端口号，我们先来看看头文件和相应的新增转发表条目的方法：

```cpp
class Router
{
public:
  // ...

private:
  std::pair<size_t, std::optional<Address>> find_best_route( const IPv4Datagram& dgram ) const;

  // The router's collection of network interfaces
  std::vector<std::shared_ptr<NetworkInterface>> interfaces_ {};

  struct ForwardEntry
  {
    uint32_t route_prefix {};
    uint8_t prefix_length {};
    std::optional<Address> next_hop = std::nullopt;
    size_t interface_num {};
  };
  std::vector<ForwardEntry> forward_table_ {};
};
```

```cpp
void Router::add_route( const uint32_t route_prefix,
                        const uint8_t prefix_length,
                        const optional<Address> next_hop,
                        const size_t interface_num )
{
  forward_table_.push_back( { route_prefix, prefix_length, next_hop, interface_num } );
}
```

然后我们要实现按转发表转发数据的方法。一个路由器有多个端口，每个端口通常对应一个子网。这里的 NetworkInterface 是对端口的抽象，路由器则通过端口之间的数据交换实现了多个子网之间的数据交换。

我们可以用前缀树把查表速度优化为常数级，但 Lab 文档说 $O(N)$ 的查表速度是可以接受的，所以我这里就不优化了。

```cpp
void Router::route()
{
  for ( auto& interface : interfaces_ ) {
    auto& datagram_received = interface->datagrams_received();

    while ( not datagram_received.empty() ) {
      auto dgram = std::move( datagram_received.front() );
      datagram_received.pop();

      const auto [interface_num, next_hop] = find_best_route( dgram );

      if ( dgram.header.ttl != 0 && --dgram.header.ttl != 0 && next_hop.has_value() ) {
        dgram.header.compute_checksum();
        interfaces_[interface_num]->send_datagram( std::move( dgram ), next_hop.value() );
      }
    }
  }
}
```

要注意左移 32 位是未定义行为，所以我们要特殊处理 prefix_length == 0 即默认路由的情况。

```cpp
std::pair<size_t, std::optional<Address>> Router::find_best_route( const IPv4Datagram& dgram ) const
{
  size_t interface_num = 0;
  std::optional<Address> next_hop = std::nullopt;
  uint8_t longest_prefix_match = 0;

  for ( const auto& entry : forward_table_ ) {
    if ( entry.prefix_length < longest_prefix_match ) {
      continue;
    }
    const uint32_t mask = ( entry.prefix_length == 0 ) ? 0 : ( UINT32_MAX << ( 32 - entry.prefix_length ) );
    if ( ( entry.prefix_length == 0 ) || ( ( dgram.header.dst & mask ) == ( entry.route_prefix & mask ) ) ) {
      // The range of left shift counts is limited in 0-31, so `mask` is not reliable when
      // entry.prefix_length == 0, which means the entry is the default route, so we do not use `mask` when
      // prefix_length == 0
      interface_num = entry.interface_num;
      longest_prefix_match = entry.prefix_length;
      next_hop = entry.next_hop.value_or( Address::from_ipv4_numeric( dgram.header.dst ) );
    }
  }
  return { interface_num, next_hop };
}
```