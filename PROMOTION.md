# 🚀 Zabbix Template Publisher 插件推广

## 一句话介绍

Zabbix Template Publisher 是一个 Cursor 编辑器插件，让 Zabbix 监控模板的开发和发布变得像写代码一样简单！

---

## 😫 你是否遇到过这些痛点？

- ❌ 手动编写 Zabbix XML 模板，格式复杂容易出错
- ❌ 模板需要手动上传到 NextCloud，步骤繁琐
- ❌ 测试环境导入模板要登录 Zabbix 网页，反复操作
- ❌ 团队协作时，模板版本管理混乱
- ❌ 每次发布都要联系运维，沟通成本高

## ✨ 现在，一个插件解决所有问题！

Zabbix Template Publisher 让监控模板开发变得**自动化、标准化、高效化**：

### 核心功能

**1. 配置文件转模板（Properties → XML）**
- 用简单的 `.properties` 文件定义监控项
- 一键自动转换为标准 Zabbix XML 模板
- 告别手写 XML 的痛苦

**2. 自动上传到 NextCloud**
- 插件自动上传模板到 NextCloud 指定目录
- 支持自动版本管理（从 pom.xml 读取）
- 运维人员可直接从 NextCloud 获取最新模板

**3. 自动导入测试环境**
- 配置 Zabbix 测试环境后，插件自动导入模板
- 支持自动创建缺失的主机组
- 秒级验证，不用再登录 Zabbix 网页

**4. 主从分离架构**
- 主监控项由运维统一管理
- 各业务团队只需维护自己的业务监控项
- 零协调成本，各自独立开发

---

## 🎯 典型使用场景

### 场景 1：新增业务监控指标
**传统方式**：手写 XML → 上传 NextCloud → 登录 Zabbix → 导入模板 → 测试验证
⏱️ **耗时**：30-60 分钟

**使用插件**：编写 `.properties` 文件 → 右键点击 "Publish Zabbix Template"
⏱️ **耗时**：5 分钟
🎉 **效率提升**：6-12 倍

### 场景 2：修改监控项配置
**传统方式**：修改 XML → 重新上传 → 重新导入 → 验证
⏱️ **耗时**：20-30 分钟

**使用插件**：修改 `.properties` → 快捷键 `Ctrl+Shift+Z`
⏱️ **耗时**：2 分钟
🎉 **效率提升**：10-15 倍

### 场景 3：团队协作开发
**传统方式**：模板文件版本冲突、手动合并、协调困难
**使用插件**：配置文件代码化，Git 管理，标准流程

---

## 📦 快速开始（3 步上手）

### 步骤 1：安装插件

在 Cursor 中按 `Ctrl/Cmd + Shift + X`，搜索 **"Zabbix Template Publisher"**，点击安装

或者直接访问：https://open-vsx.org/extension/shon-chen/zabbix-template-publisher

### 步骤 2：配置插件

按 `Ctrl + ,` 打开设置，搜索 "Zabbix Template Publisher"

**必填项**：
```
NextCloud URL: https://your-nextcloud.com
Username: 你的用户名
Password: 应用专用密码
```

**可选项（推荐配置，实现自动导入测试环境）**：
```
Zabbix URL: https://your-zabbix.com/zabbix
Zabbix Username: 你的 Zabbix 用户名
Zabbix Password: 你的 Zabbix 密码
```

### 步骤 3：创建配置文件

在 `src/main/resources/zabbix/` 目录下创建 `{serviceName}_business_template.properties` 文件：

```properties
# 模板基本信息
zabbix.template="your_service_business_template"
zabbix.template.name="your_service_business_template"
zabbix.template.version="5.0"

# 模板组
zabbix.groups[0].name="business_monitor"

# 应用信息
zabbix.applications[0].name="your_service"

# 模板依赖（重要：声明依赖主监控项）
zabbix.templates[0].name="master_prometheus_business_template"

# 业务监控项
zabbix.items[0].name="your_metric_name"
zabbix.items[0].key="your_metric_key"
zabbix.items[0].type="DEPENDENT"
zabbix.items[0].value_type="FLOAT"
zabbix.items[0].master_item="master.prometheus[{$EXPORTTOOL_URL}]"
zabbix.items[0].preprocessing_type="PROMETHEUS_PATTERN"
zabbix.items[0].preprocessing_params="your_metric_name{}"
zabbix.items[0].appName="your_service"
```

### 步骤 4：一键发布

**三种方式任选一种**：
1. 右键点击配置文件 → 选择 "Publish Zabbix Template"
2. 打开配置文件 → 按快捷键 `Ctrl+Shift+Z` (Mac: `Cmd+Shift+Z`)
3. 命令面板 `Ctrl+Shift+P` → 输入 "Publish Zabbix Template"

插件会自动：
✅ 转换为 XML 模板
✅ 上传到 NextCloud
✅ 导入到 Zabbix 测试环境（如已配置）
✅ 自动创建缺失的主机组

---

## 🎁 核心优势总结

| 优势 | 说明 |
|------|------|
| 🚀 **效率提升** | 从 30 分钟缩短到 2 分钟，效率提升 15 倍 |
| 🎯 **零出错率** | 自动转换和校验，避免手写 XML 错误 |
| 🔄 **自动化流程** | 转换 → 上传 → 导入 → 创建主机组，全自动 |
| 👥 **团队协作** | 配置文件代码化，Git 管理，标准化流程 |
| 📦 **主从分离** | 运维管理主监控项，开发独立维护业务监控项 |
| ⚡ **即时验证** | 自动导入测试环境，秒级反馈 |
| 📝 **配置简单** | Properties 格式比 XML 简单 10 倍 |
| 🔌 **无缝集成** | 与现有工作流完美融合，学习成本低 |

---

## 📊 实际效果

**某业务团队使用前**：
- 每月新增/修改监控项：10 次
- 平均每次耗时：30 分钟
- 月度总耗时：**300 分钟 ≈ 5 小时**

**使用插件后**：
- 平均每次耗时：2 分钟
- 月度总耗时：**20 分钟**
- **时间节省**：**93%**
- **释放人力**：相当于每月节省 4.7 小时，可用于更有价值的工作

---

## 🆘 需要帮助？

**完整文档**：
- 插件使用指南：`doc/cursor-plugin-guide.md`
- 配置参数参考：`doc/configuration-reference.md`
- 常见问题 FAQ：`doc/faq.md`
- 故障排查：`doc/troubleshooting.md`

**技术支持**：
- GitHub：https://github.com/chengang12345632/zabbix-template-publisher-cursor
- 插件市场：https://open-vsx.org/extension/shon-chen/zabbix-template-publisher

---

## 🎉 立即体验

**现在就安装插件，让 Zabbix 监控开发变得简单高效！**

**安装命令**：
在 Cursor 中按 `Ctrl/Cmd + Shift + X`，搜索 "Zabbix Template Publisher"

**或访问**：
https://open-vsx.org/extension/shon-chen/zabbix-template-publisher

---

**插件开源免费，欢迎使用和反馈建议！**

**让监控开发不再繁琐，把时间花在更有价值的事情上！** 🚀

