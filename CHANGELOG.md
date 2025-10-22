# 更新日志

所有重要的变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且遵守 [语义化版本](https://semver.org/lang/zh-CN/)。

## [2.0.0] - 2025-10-22

### 重大更新 🎉

- 🔄 **合并模板功能** - 解决Zabbix模板依赖冲突问题
  - 新增XML模板解析器 (`XmlTemplateParser`)
  - 新增模板合并器 (`TemplateMerger`)
  - 新增合并模板服务 (`MergedTemplateService`)
  - 智能合并多个模板为单一模板
  - 自动处理配置冲突和依赖关系

- 🔧 **Dev/Release双环境工作流**
  - Dev环境：生成并测试合并模板（不上传到NextCloud）
  - Release环境：发布到生产环境（上传并生成合并模板）
  - 开发测试与生产发布完全隔离
  - 支持快速验证和安全发布

- 📦 **NextCloud增强集成**
  - 新增 `listFiles()` - 列出目录文件
  - 新增 `downloadFile()` - 下载文件内容
  - 自动从 `zabbix_template_release/` 拉取Release模板
  - 自动上传合并模板到 `zabbix_template_release/merged/`

### 新增功能

- ✨ 右键菜单命令
  - `🔧 开发测试 - 生成合并模板` - Dev环境测试
  - `🚀 生产发布 - 发布合并模板` - Release环境发布
- ✨ 自动模板合并
  - 合并模板组、应用分组、宏定义
  - 合并监控项和发现规则
  - 冲突检测和处理
- ✨ 模板验证
  - 验证合并后的模板完整性
  - 检查依赖关系
  - 检查DEPENDENT类型监控项

### 配置更新

- ⚙️ 新增配置项
  - `nextcloud.releasePath` - Release环境模板目录
  - `nextcloud.mergedPath` - 合并模板目录
  - 更新Zabbix配置说明（明确为测试环境）

### 文档更新

- 📖 README更新到V4.0
  - 添加合并模板功能说明
  - 添加Dev/Release工作流介绍
  - 添加使用建议和选择指南
- 📖 新增文档
  - `doc/merged-template-guide.md` - 合并模板使用指南
  - `doc/merged_template_implementation_plan.md` - 实现方案文档
- 📖 文档整合
  - 删除重复和过时的文档
  - 整合技术文档到BUILD.md

### 技术改进

- 🏗️ 新增模块
  - `src/parsers/xmlTemplateParser.ts` - XML模板解析器
  - `src/services/templateMerger.ts` - 模板合并器
  - `src/services/mergedTemplateService.ts` - 合并模板服务
- 🔧 代码重构
  - 优化NextCloudClient
  - 增强extension.ts命令处理
  - 改进错误处理和日志输出

### 突破性变更

- ⚠️ package.json配置更新
  - 新增右键菜单命令
  - 更新配置项说明
  - 命令分组优化

## [1.0.2] - 2025-10-21

### 文档优化

- 📝 增加开发环境主机绑定操作详细说明
  - 添加登录Zabbix测试环境步骤
  - 添加查找目标主机步骤
  - 添加链接监控模板详细操作
  - 添加数据采集验证步骤
- 📖 增加Kafka消息字段映射注释
  - `zabbix.items[0].name` 对应 Kafka 消息 `n (domain)` 字段
  - `zabbix.discovery_rules[0].lld_macros` 对应 Kafka 消息 `l (label)` 字段
- 🎯 优化步骤4标题，去除"（生产环境）"后缀

### 改进

- ✨ 完善测试环境自助验证流程
- 📚 提高文档可读性和实用性

## [1.0.0] - 2025-10-18

### 新增功能

- ✨ 支持Properties配置文件自动解析
- 🔄 自动将Properties转换为Zabbix标准XML格式
- ☁️ 自动上传到NextCloud（版本目录 + all_zabbix_template目录）
- 🔗 智能识别并处理模板依赖关系
- 🎯 支持自动导入到Zabbix测试环境
- 📦 批量处理主监控项模板和业务模板
- 🔍 自动从pom.xml读取版本号和服务名
- 📝 支持三种触发方式：命令面板、右键菜单、快捷键
- 🎨 实时进度展示
- 📖 完整的文档和示例

### 技术特性

- 🏗️ 基于TypeScript开发
- 📦 模块化架构设计
- 🔌 支持NextCloud WebDAV协议
- 🔌 支持Zabbix JSON-RPC API
- 🎯 完整的类型定义
- 🔧 可配置化设计

### 支持的配置项

**Properties支持:**
- 模板基本信息 (template, name, version)
- 模板组 (groups)
- 应用 (applications)
- 模板依赖 (templates) ⭐
- 宏定义 (macros)
- 监控项 (items)
- 发现规则 (discovery_rules)
- 监控项原型 (item_prototype)

**XML生成:**
- 完整的Zabbix 5.0 XML格式
- 自动处理依赖监控项 (DEPENDENT type)
- 自动生成LLD宏路径映射
- 自动处理Prometheus预处理步骤

### 文档

- 📖 完整的用户手册
- 🚀 快速开始指南
- 📋 Properties到XML转换对照表
- ❓ FAQ和故障排查指南
- 💡 示例配置文件

## [未来计划]

### 计划功能

- [ ] 支持更多Zabbix版本 (6.0, 6.4)
- [ ] 支持批量导入多个模板
- [ ] 支持模板版本对比
- [ ] 支持从XML反向生成Properties
- [ ] 支持模板验证和语法检查
- [ ] 支持模板预览功能
- [ ] 图形界面配置编辑器
- [ ] 支持模板导出和备份
- [ ] 支持更多云存储（阿里云OSS、腾讯云COS等）

### 待改进

- [ ] 添加单元测试覆盖
- [ ] 添加集成测试
- [ ] 优化错误处理和提示
- [ ] 支持多语言（中文/英文）
- [ ] 性能优化

---

**格式说明:**

- `新增功能` - 新功能
- `变更` - 现有功能的变更
- `废弃` - 即将移除的功能
- `移除` - 已移除的功能
- `修复` - Bug修复
- `安全` - 安全相关的修复

**版本号说明:**

- 主版本号：不兼容的API变更
- 次版本号：向下兼容的新功能
- 修订号：向下兼容的Bug修复

