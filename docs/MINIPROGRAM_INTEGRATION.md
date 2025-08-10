# 微信小程序与Web应用集成指南

## 概述

本文档旨在为微信小程序开发团队提供与Echoes Web应用进行用户认证集成的详细说明。为了确保用户在小程序和Web应用之间获得无缝、安全的体验，我们设计了以下单点登录（SSO）流程。

核心流程是：小程序负责获取用户的登录凭证和基本信息，然后通过特定的URL将用户导航至Web应用，Web应用后端将完成后续的身份验证和会话创建。

---

## 小程序端开发需求

为了完成集成，小程序端需要实现以下三个步骤：

### 1. 获取临时登录凭证 (`code`)

在触发登录流程时，小程序需要调用微信官方的 `wx.login()` API，以获取一个临时的登录凭证 `code`。这个`code`是后续所有验证步骤的起点。

```javascript
// 示例代码
wx.login({
  success(res) {
    if (res.code) {
      const code = res.code;
      // 接续后续步骤...
    } else {
      console.log('登录失败！' + res.errMsg);
    }
  },
});
```

### 2. 获取用户基本信息

我们需要用户的 **昵称 (`nickName`)** 和 **头像URL (`avatarUrl`)** 来在Web应用中创建和展示用户资料。

推荐使用 `wx.getUserProfile()` 方法来获取这些信息，因为它能提供更丰富的用户数据。请注意，此方法需要用户明确授权。

```javascript
// 示例代码
wx.getUserProfile({
  desc: '用于完善会员资料', // 声明获取用户个人信息后的用途
  success: (res) => {
    const nickName = res.userInfo.nickName;
    const avatarUrl = res.userInfo.avatarUrl;
    // 接续后续步骤...
  },
  fail: (err) => {
    // 处理用户拒绝授权的情况，可以考虑使用默认值
    console.error(err);
  },
});
```

### 3. 构造URL并跳转到Web应用

获取到 `code`、`nickName` 和 `avatarUrl` 后，小程序需要将这些信息作为URL查询参数，构造一个完整的URL，并使用 `wx.navigateTo`（或类似功能）跳转到此URL。

**Web应用认证地址**: `https://<你的Web应用域名>/auth/wechat`

**URL查询参数**:

- `code`: (必需) 从 `wx.login()` 获取的临时凭证。
- `nickName`: (必需) 用户的昵称。
- `avatarUrl`: (可选) 用户的头像URL。

**URL构造示例**:

```javascript
const webAppUrl = 'https://<你的Web应用域名>/auth/wechat';
const params = new URLSearchParams({
  code: code, // 从步骤1获取
  nickName: nickName, // 从步骤2获取
  avatarUrl: avatarUrl || '', // 从步骤2获取，如果不存在则为空字符串
});

const finalUrl = `${webAppUrl}?${params.toString()}`;

// 使用小程序内置的 web-view 组件或 wx.navigateTo 打开此URL
// 注意：目标URL需要被配置在小程序的业务域名白名单中
// wx.navigateTo({ url: `/pages/webview/index?url=${encodeURIComponent(finalUrl)}` });
```

---

## Web应用端处理流程（参考）

为了帮助理解，这里简要说明一下Web应用在接收到跳转后会做什么：

1.  **接收参数**: Web应用的 `/auth/wechat` 页面从URL中提取 `code` 等参数。
2.  **后端验证**: 页面将 `code` 发送到Web应用的后端。
3.  **服务器交换**: Web应用后端使用 `code` 和预存的 `AppSecret`，向微信服务器请求`openId`，以验证用户的真实性。
4.  **创建/登录用户**: 后端使用`openId`在数据库中查找或创建用户。
5.  **创建会话**: 为用户创建一个安全的会话（Session），并返回给前端。
6.  **完成跳转**: Web应用前端将用户重定向到应用主页，此时用户已处于登录状态。

如有任何疑问，请随时与我们沟通。
