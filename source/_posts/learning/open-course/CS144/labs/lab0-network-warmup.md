---
title: Lab 0 Networking Warmup
toc: true
date: 2025-12-10 18:03:28
tags:
categories:
  - 公开课
  - CS144
  - Labs
---

在这个 Lab 里我们要实现一个发 GET 请求的函数和一个“内存字节流”，我们开始吧。

## webget

首先我们回顾一下 CSAPP 里客户端使用 socket 接口的方法：getaddrinfo -> socket -> connect -> read/write -> close

然后对照 socket.hh 和 file_descriptor.hh 写出 C++ 版本的代码就行：

```cpp
void get_URL( const string& host, const string& path )
{
  TCPSocket socket;
  socket.connect( Address( host, "http" ) );
  socket.write( "GET " + path + " HTTP/1.1\r\nHost: " + host + "\r\nConnection: close\r\n\r\n" );
  std::string buf;
  while ( !socket.eof() ) {
    socket.read( buf );
    std::cout << buf;
    buf.clear();
  }
}
```

这里不需要手动调用 close，因为 file_descriptor.cc 的析构函数 ~FDWrapper() 自己会调用 close. 这是遵循了 C++ 的 RAII 规范。

测试代码的原理是 webget_t.sh 用管道重定向程序输出，然后对比正确值。

## byte stream

我们需要实现一个内存字节流，写者可以往里面写东西，读者可以读，字节流有最大容量。Lab 文档说无需考虑并发，所以我们简单做个环形队列然后设置读写头就行（死去的 6S081 记忆突然攻击我！）

首先设置几个成员变量，这里的 head_ 始终指向第一个有效数据，tail_ 始终指向空位置：

<img src="/images/learning/open-course/CS144/labs/lab0/ring.png" width="50%" height="auto">

```cpp
class ByteStream
{
public:
  explicit ByteStream( uint64_t capacity );

  // Helper functions (provided) to access the ByteStream's Reader and Writer interfaces
  Reader& reader();
  const Reader& reader() const;
  Writer& writer();
  const Writer& writer() const;

  void set_error() { error_ = true; };       // Signal that the stream suffered an error.
  bool has_error() const { return error_; }; // Has the stream had an error?

protected:
  // Please add any additional state to the ByteStream here, and not to the Writer and Reader interfaces.
  uint64_t capacity_;
  uint64_t tot_pushed_ {};
  uint64_t head_ {}, tail_ {};
  std::vector<char> ring_;
  bool closed_ {};
  bool error_ {};
};
```

这里成员变量命名结尾带下划线是 Google C++ Style，利于区分成员变量和局部变量 / 函数参数。

然后这里的 Reader 和 Writer 方法有什么用呢？Reader 和 Writer 继承自 ByteStream，允许用户用不同视角看同一个对象。这么说有点抽象，可以看向 byte_stream_helpers.cc，它只是做了类型转换。

```cpp
Reader& ByteStream::reader()
{
  static_assert( sizeof( Reader ) == sizeof( ByteStream ),
                 "Please add member variables to the ByteStream base, not the ByteStream Reader." );

  return static_cast<Reader&>( *this ); // NOLINT(*-downcast)
}
```

读者和写者操控的是一个 ByteStream 对象，所以我们要提供两种不同的视角，每种视角有不同的操作数据的方法。

然后实现两种视角各自的接口：

```cpp
#include "byte_stream.hh"
#include "debug.hh"

using namespace std;

// Leave one space to distinguish between a full ring and an empty ring.
ByteStream::ByteStream( uint64_t capacity ) : capacity_( capacity ), ring_( capacity + 1 ) {}

// Push data to stream, but only as much as available capacity allows.
void Writer::push( const string& data )
{
  const auto written_len = std::min( available_capacity(), data.size() );
  if ( written_len == 0 ) {
    return;
  }
  for ( uint64_t i = 0; i < written_len; i++ ) {
    ring_[tail_] = data[i];
    tail_ = ( tail_ + 1 ) % ring_.size();
  }
  tot_pushed_ += written_len;
}

// Signal that the stream has reached its ending. Nothing more will be written.
void Writer::close()
{
  closed_ = true;
}

// Has the stream been closed?
bool Writer::is_closed() const
{
  return closed_; // Your code here.
}

// How many bytes can be pushed to the stream right now?
uint64_t Writer::available_capacity() const
{
  return ( head_ + ring_.size() - tail_ - 1 ) % ring_.size();
}

// Total number of bytes cumulatively pushed to the stream
uint64_t Writer::bytes_pushed() const
{
  return tot_pushed_;
}

// Peek at the next bytes in the buffer -- ideally as many as possible.
// It's not required to return a string_view of the *whole* buffer, but
// if the peeked string_view is only one byte at a time, it will probably force
// the caller to do a lot of extra work.
string_view Reader::peek() const
{
  if ( head_ == tail_ ) {
    return {};
  }
  if ( head_ < tail_ ) {
    return { ring_.begin() + static_cast<int64_t>( head_ ), ring_.begin() + static_cast<int64_t>( tail_ ) };
  }
  return { ring_.begin() + static_cast<int64_t>( head_ ), ring_.end() };
}

// Remove `len` bytes from the buffer.
void Reader::pop( uint64_t len )
{
  head_ = ( head_ + len ) % ring_.size();
}

// Is the stream finished (closed and fully popped)?
bool Reader::is_finished() const
{
  return closed_ && ( head_ == tail_ );
}

// Number of bytes currently buffered (pushed and not popped)
uint64_t Reader::bytes_buffered() const
{
  return ( tail_ + ring_.size() - head_ ) % ring_.size();
}

// Total number of bytes cumulatively popped from stream
uint64_t Reader::bytes_popped() const
{
  return tot_pushed_ - bytes_buffered();
}
```

然后放下测试结果：

<img src="/images/learning/open-course/CS144/labs/lab0/test.png" width="70%" height="auto">
写这个 Lab 的感想就是 C++ 好复杂…