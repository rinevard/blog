---
title: Lab 2 The TCP receiver
toc: true
date: 2025-12-15 20:40:28
tags:
categories:
  - 公开课
  - CS144
  - Labs
---

在这个 Lab 里我们要写 TCP 协议的接收方收到数据时的处理函数，以及构造接收方的回信的函数。

在 TCP 协议中我们要和三种索引打交道：

1. seqno: 在 TCP 头部中空间很宝贵，所以只用 32 位来存储序列号，这就是 seqno. 考虑到安全性，seqno 不从 0 开始，而是从一个随机数 ISN 开始。
2. absolute seqno: 每个 TCP 连接中的字节流以 SYN 为开头，FIN 为结尾。用 64 位给每个字节编号就得到了 absolute deqno.
3. stream index: 用 64 位给 TCP 连接中除 SYN 和 FIN 以外的实际数据编码就得到了 stream index.

|  | Sequence Numbers | Absolute Sequence Numbers | Stream Indices |
| --- | --- | --- | --- |
| 标识 | "seqno" | "absolute seqno" | "stream index" |
| 起始点 | 从 ISN 开始 | 从 0 开始 | 从 0 开始 |
| 内容范围 | 包括 SYN/FIN | 包括 SYN/FIN | 不包含 SYN/FIN |
| 性质 | 32 bits, 回绕 | 64 bits, 不回绕 | 64 bits, 不回绕 |

这里是示例数据，假设 ISN 为 $2^{32} - 2$，传输的内容为 “cat”，则有：

| element | SYN | c | a | t | FIN |
| --- | --- | --- | --- | --- | --- |
| seqno | $2^{32} - 2$ | $2^{32} - 1$ | 0 | 1 | 2 |
| absolute seqno | 0 | 1 | 2 | 3 | 4 |
| stream index |  | 0 | 1 | 2 |  |

## Translating between 64-bit indexes and 32-bit seqnos

在 Lab 的开始我们要写 seqno 和 absolute seqno 间相互转换的两个函数，我的实现如下：

```cpp
Wrap32 Wrap32::wrap( uint64_t n, Wrap32 zero_point )
{
  return zero_point + static_cast<uint32_t>( n );
}

uint64_t Wrap32::unwrap( Wrap32 zero_point, uint64_t checkpoint ) const
{
  auto dist = [checkpoint]( uint64_t x ) { return x > checkpoint ? ( x - checkpoint ) : ( checkpoint - x ); };
  const uint64_t k = checkpoint >> 32;
  const uint64_t val1 = raw_value_ - zero_point.raw_value_ + k * ( 1ULL << 32 );
  const uint64_t val2 = raw_value_ - zero_point.raw_value_ + ( k + 1 ) * ( 1ULL << 32 );
  const uint64_t val3 = raw_value_ - zero_point.raw_value_ + ( k - 1 ) * ( 1ULL << 32 );
  return std::min( { val1, val2, val3 }, [dist]( uint64_t x, uint64_t y ) { return dist( x ) < dist( y ); } );
}
```

## Implementing the TCP receiver

然后我们要给 TCP 接收方写收到数据的处理函数和构造回信的函数了。这里主要有三个难点，我们分析一下：

1. 怎么根据 message 里的 RST、SYN、FIN 改变收信方的状态？
    
    我们可以把 TCP receiver 分成 LISTEN、SYN_RCVD、CLOSE_WAIT 三种状态， LISTEN 是还没收到 SYN 的状态，SYN_RCVD 是收到 SYN 后正常接收数据的状态，CLOSE_WAIT 则是收到 FIN 后的状态。
    
    另外，RST 表示发生了不可挽回的错误，因此在收到 RST 后应该立即抛出异常。在我们的代码里就表现为关闭 ByteStream. 每个 TCP 连接和一个 ByteStream 唯一绑定，是该连接向用户交付数据的唯一渠道。
    
2. 怎么计算 ackno？
    
    ackno 是我们需要的下一个 byte 的 32 位索引，也就是尚未被写入 ByteStream 的最小索引。ByteStream 存的是 stream index，所以我们要先根据它算出 absolute seqno，再用我们之前实现的 Wrap32 的各种方法得到 32 位的 ackno：
    
    ```cpp
    const uint64_t abs_ackno = reassembler_.writer().bytes_pushed() + seen_syn_ + reassembler_.writer().is_closed();
    const std::optional<Wrap32> ackno
      = seen_syn_ ? std::optional<Wrap32>( Wrap32::wrap( abs_ackno, zero_point_ ) ) : std::nullopt;
    ```
    
    这里的 reassembler_.writer().is_closed() 不能换成 seen_fin_，因为收到 FIN 并不代表数据已经被填入了 ByteStream.
    
3. 怎么计算 stream index？
    
    对带 SYN 的 message，stream index 就是 0.
    
    对不带 SYN 的 message，stream index 是 absolute seqno - 1.
    

最后我们放代码：

```cpp
class TCPReceiver
{
public:
  // ...
private:
  Reassembler reassembler_;
  Wrap32 zero_point_ { 0 };
  bool seen_syn_ { false };
};
```

```cpp
void TCPReceiver::receive( TCPSenderMessage message )
{
  if ( message.RST ) {
    reassembler_.reader().set_error();
    return;
  }
  if ( !seen_syn_ && !message.SYN ) {
    return;
  }
  if ( !seen_syn_ && message.SYN ) {
    zero_point_ = message.seqno;
    seen_syn_ = true;
  }
  const uint64_t abs_ackno = reassembler_.writer().bytes_pushed() + seen_syn_ + reassembler_.writer().is_closed();
  const uint64_t stream_idx = message.seqno.unwrap( zero_point_, abs_ackno ) - !message.SYN;
  reassembler_.insert( stream_idx, std::move( message.payload ), message.FIN );
}
```

```cpp
TCPReceiverMessage TCPReceiver::send() const
{
  const uint64_t abs_ackno = reassembler_.writer().bytes_pushed() + seen_syn_ + reassembler_.writer().is_closed();
  const std::optional<Wrap32> ackno
    = seen_syn_ ? std::optional<Wrap32>( Wrap32::wrap( abs_ackno, zero_point_ ) ) : std::nullopt;
  const uint16_t window_size = ( reassembler_.writer().available_capacity() > UINT16_MAX )
                                 ? UINT16_MAX
                                 : static_cast<uint16_t>( reassembler_.writer().available_capacity() );
  return { ackno, window_size, reassembler_.reader().has_error() };
}
```