# 🚀 Zabbix Template Publisher 插件推广

## 一句话介绍

Zabbix Template Publisher 是 Cursor 编辑器插件，让 Zabbix 监控模板开发效率提升 10 倍！

---

## 核心痛点

- ❌ 手动编写 XML 模板，格式复杂易出错
- ❌ 手动上传 NextCloud，手动导入 Zabbix，步骤繁琐
- ❌ 每次修改都要重复操作，耗时 30-60 分钟

## 解决方案

✅ 用 `.properties` 文件代替 XML，配置简单 10 倍
✅ 一键自动转换、上传、导入，全流程自动化
✅ 从 30 分钟缩短到 2 分钟，效率提升 15 倍

---

## 快速上手

### 1. 安装插件
Cursor 中按 `Ctrl/Cmd + Shift + X`，搜索 **"Zabbix Template Publisher"**

或访问：https://open-vsx.org/extension/shon-chen/zabbix-template-publisher

### 2. 配置连接
按 `Ctrl + ,` 搜索 "Zabbix Template Publisher"，填写：
- NextCloud URL、用户名、密码（必填）
- Zabbix URL、用户名、密码（可选，用于自动导入测试环境）

### 3. 创建配置文件
在 `src/main/resources/zabbix/` 下创建 `{serviceName}_business_template.properties`：

```properties
zabbix.template="your_service_business_template"
zabbix.template.name="your_service_business_template"
zabbix.groups[0].name="business_monitor"
zabbix.applications[0].name="your_service"
zabbix.templates[0].name="master_prometheus_business_template"

# 业务监控项
zabbix.items[0].name="your_metric_name"
zabbix.items[0].key="your_metric_key"
zabbix.items[0].type="DEPENDENT"
zabbix.items[0].master_item="master.prometheus[{$EXPORTTOOL_URL}]"
zabbix.items[0].preprocessing_type="PROMETHEUS_PATTERN"
zabbix.items[0].preprocessing_params="your_metric_name{}"
```

### 4. 一键发布
右键配置文件 → "Publish Zabbix Template" 或快捷键 `Ctrl+Shift+Z`

插件自动完成：转换 XML → 上传 NextCloud → 导入 Zabbix 测试环境 → 创建主机组

---

## 核心优势

🚀 **效率提升 15 倍**：30 分钟 → 2 分钟
🎯 **零出错率**：自动转换校验，告别手写 XML
🔄 **全流程自动化**：一键完成转换、上传、导入
📦 **主从分离架构**：运维管理主监控项，开发独立维护业务监控项
⚡ **即时验证**：自动导入测试环境，秒级反馈

---

## 实际效果

每月处理 10 次监控项变更：
- 使用前：300 分钟（5 小时）
- 使用后：20 分钟
- **节省时间：93%**

---

## 安装体验

在 Cursor 中按 `Ctrl/Cmd + Shift + X`，搜索 **"Zabbix Template Publisher"**

插件地址：https://open-vsx.org/extension/shon-chen/zabbix-template-publisher
GitHub：https://github.com/chengang12345632/zabbix-template-publisher-cursor

**插件开源免费，让监控开发不再繁琐！** 🚀

