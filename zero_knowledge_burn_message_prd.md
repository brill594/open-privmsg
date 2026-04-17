# PRD：零知识阅后即焚私信服务（privmsg）

## 1. 产品概述

### 1.1 一句话定义
一个**纯 Web、端到端加密（E2EE）、阅后即焚、支持多附件**的私密消息分享服务。

### 1.2 核心特性
- 无需注册
- Web Crypto 必选（客户端加密）
- 服务端零知识（无法读取明文）
- 一次性阅读 + 自动销毁
- 支持多附件（总大小 ≤ 50MB）
- 前后端完全开源
- 部署版本可验证对应开源代码

---

## 2. 产品定位

### 2.1 正确定位
- 零知识私信服务（可选添加附件）
- 端到端加密阅后即焚
- 私密分享工具

### 2.2 非目标
- 不提供强匿名
- 不提供防截图
- 不提供附件安全扫描
- 不提供聊天系统

---

## 3. 核心原则

1. 所有内容必须客户端加密
2. 解密密钥不进入服务端
3. 服务端只存储密文
4. 成功解密后才销毁
5. 附件与文本同级保护
6. 不做服务端恶意文件扫描
7. 明确产品安全边界

---

## 4. 用户流程

### 4.1 发送流程

用户输入 → 浏览器生成密钥 → 本地加密 → 上传密文 → 返回链接

```
https://your.site/m/<id>#<key>
```

### 4.2 接收流程

打开链接 → 获取密文 → 本地解密 → 显示 → confirm-read → 删除

### 4.3 销毁规则

- GET 不销毁
- 解密成功后 POST confirm-read 才销毁
- 解密失败不销毁

---

## 5. 附件策略

### 5.1 数量与大小
- 附件数量不限
- 总大小 ≤ 50MB

### 5.2 支持格式

#### 图片
- jpg / jpeg
- png
- webp
- gif

#### 视频
- mp4
- webm
- mov（兼容时可预览）

#### 文本/文档
- txt
- pdf

### 5.3 禁止格式
- html
- svg
- js
- exe / apk / dmg
- docm / xlsm
- 其他可执行或脚本化格式

### 5.4 设计说明
- 类型限制仅用于减少误用
- 不构成安全扫描

---

## 6. 附件预览策略

### 6.1 可预览类型
- 图片（全部支持）
- 视频：mp4、webm
- 文本：txt
- PDF：pdf

### 6.2 MOV 特殊说明
- 浏览器支持时可预览
- 不支持时仅下载

### 6.3 安全策略
- 所有预览在隔离容器中完成
- 文本使用 textContent 渲染
- PDF 使用 PDF.js
- 不可信内容不得进入主 DOM

---

## 7. 加密设计

### 7.1 算法
- AES-GCM
- 256-bit key

### 7.2 密钥模型
- master_key（URL fragment）
- HKDF 派生子密钥

### 7.3 URL

```
https://your.site/m/<id>#<master_key>
```

### 7.4 加密范围
- 文本
- 附件
- 可选元数据

---

## 8. 数据设计

### 8.1 D1 表

```
messages (
  id,
  attachment_count,
  total_size,
  created_at,
  expires_at,
  burned
)
```

### 8.2 R2

```
/messages/{id}/payload.bin
/messages/{id}/files/*.bin
```

---

## 9. API

### 创建
POST /api/create

### 获取
GET /api/message/:id

### 附件
GET /api/message/:id/file/:index

### 确认销毁
POST /api/confirm-read

---

## 10. 安全模型

### 10.1 已实现
- 服务端无法读取内容
- 数据库泄露无明文

### 10.2 未实现
- 匿名
- 防截图
- 文件安全检测

---

## 11. 附件安全声明

- 平台不扫描附件
- 不保证附件安全
- 用户需自行判断来源可信性

---

## 12. 缓存与响应

```
Cache-Control: no-store
Content-Disposition: attachment
X-Content-Type-Options: nosniff
```

---

## 13. 滥用控制

- IP 限流
- 创建频率限制
- 大小限制

---

## 14. 开源与一致性

### 14.1 原则
- 所有代码开源
- 禁止手工部署
- 仅 CI/CD 发布

### 14.2 构建保证
- 锁定依赖
- 固定 Node / Wrangler
- 生成 build-manifest.json

### 14.3 公示内容
- commit SHA
- build hash
- version id

---

## 15. 产品声明

### 隐私
平台无法读取消息内容

### 匿名
不提供匿名保护

### 附件
不做安全扫描

---

## 16. MVP

- Web Crypto
- 多附件
- 阅后即焚
- fragment key
- Workers + D1 + R2

---

## 17. 一句话总结

一个零知识、阅后即焚、纯 Web 的私密消息分享服务。

