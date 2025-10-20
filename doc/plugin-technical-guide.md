# Zabbix Template Publisher for Cursor

一键发布Zabbix监控模板到NextCloud和Zabbix测试环境的Cursor插件。

## ✨ 功能特性

- 📝 **多格式支持** 支持Properties配置文件和XML模板文件
- 🔄 **智能转换** Properties → XML格式（Properties文件）
- 📄 **直接上传** XML文件直接上传，无需转换
- ☁️ **自动上传** 到NextCloud存储（版本目录 + all_zabbix_template目录）
- 🔗 **智能识别** 主监控项模板和业务模板的依赖关系
- 🎯 **自动导入** 到Zabbix测试环境（可选）
- 📦 **灵活处理** 支持发布业务模板（推荐）或同时发布主监控项和业务模板（向后兼容）
- 🔍 **自动读取** pom.xml获取版本号和服务名
- 🌐 **分享链接** 自动生成NextCloud公开分享链接，方便团队协作
- 📊 **详细日志** 完整的输出日志，包含所有操作步骤和结果
- 🎨 **友好交互** 成功/失败弹窗支持"查看日志"和"打开文档"按钮

## 📦 安装

### 方式1: 从VSIX文件安装

1. 下载最新的 `.vsix` 文件
2. 在Cursor中按 `Ctrl/Cmd + Shift + P`
3. 输入 "Extensions: Install from VSIX..."
4. 选择下载的`.vsix`文件

### 方式2: 从源码编译

```bash
# 克隆仓库
git clone <repository-url>
cd zabbix-template-publisher-cursor

# 安装依赖
npm install

# 编译
npm run compile

# 打包（可选）
npm install -g vsce
vsce package
```

## ⚙️ 配置

### 必需配置

在Cursor设置中配置以下参数：

```
File → Preferences → Settings → 搜索 "Zabbix Template Publisher"
```

或按 `Ctrl/Cmd + ,` 然后搜索 `Zabbix Template Publisher`

#### NextCloud配置（必填）

- **NextCloud URL**: NextCloud服务器地址
  - 示例: `https://your-nextcloud.com`
  
- **Username**: NextCloud用户名
  
- **Password**: NextCloud应用专用密码
  - ⚠️ 注意：必须使用应用专用密码，不是登录密码
  - 创建方法：NextCloud → 设置 → 安全 → 创建新应用专用密码
  
- **Base Path**: NextCloud存储基础路径（默认: `/云平台开发部/监控模板`）

#### 版本号配置（可选）

- **Version**: 版本号
  - 留空则自动从 `pom.xml` 读取
  - 手动指定则使用指定版本

#### Zabbix配置（可选）

如需自动导入到Zabbix测试环境，配置以下参数：

- **Zabbix URL**: Zabbix服务器地址
  - 示例: `https://your-zabbix.com`
  
- **Username**: Zabbix用户名
  
- **Password**: Zabbix密码

## 🚀 使用方法

### 方式1: 命令面板（推荐）

1. 按 `Ctrl/Cmd + Shift + P`
2. 输入 "Publish Zabbix Template"
3. 选择命令执行

### 方式2: 右键菜单

1. 在资源管理器中右键点击 `.properties` 或 `.xml` 文件
2. 选择 "Publish Zabbix Template"

### 方式3: 快捷键

1. 打开 `.properties` 或 `.xml` 文件
2. 按 `Ctrl/Cmd + Shift + Z`

## 📁 项目结构要求

```
your-project/
├── pom.xml                          # 可选，用于读取version和artifactId
└── src/main/resources/zabbix/
    └── {serviceName}_business_template.properties            # 业务监控项配置（必需）
```

> 💡 **说明**：主监控项模板由运维人员统一维护到NextCloud，各组件项目中**无需创建**主监控项配置文件

## 🔄 工作流程

### Properties文件流程

```
1. 选择Properties配置文件
   ↓
2. 解析Properties配置
   ↓
3. 转换为XML格式
   - {serviceName}_business_template.xml
   ↓
4. 上传到NextCloud
   - /{version}/
   - /all_zabbix_template/
   - 生成公开分享链接
   ↓
5. 导入到Zabbix测试环境（如已配置）
   ↓
6. 显示结果
```

### XML文件流程

```
1. 选择XML模板文件
   ↓
2. 直接读取XML内容
   ↓
3. 提取模板名称
   ↓
4. 上传到NextCloud
   - /{version}/
   - /all_zabbix_template/
   - 生成公开分享链接
   ↓
5. 导入到Zabbix测试环境（如已配置）
   ↓
6. 显示结果
```

> 💡 **工作分工**：运维人员负责维护主监控项模板到NextCloud，开发人员可维护Properties配置或直接使用XML模板

## 📝 配置文件示例

### 主监控项配置（仅供参考）

> 💡 **说明**：主监控项由运维人员统一维护到NextCloud，各组件无需创建此文件。以下仅作为参考。

**参考示例**：[master_prometheus_business_template.properties](examples/master_prometheus_business_template.properties)

```properties
# 此配置由运维管理人员维护，各组件无需关注
zabbix.template="master_prometheus_business_template"
zabbix.template.name="master_prometheus_business_template"
zabbix.template.version="5.0"
zabbix.groups[0].name="business_monitor"
zabbix.applications[0].name="Prometheus"

zabbix.macros[0].macro="{$EXPORTTOOL_URL}"
zabbix.macros[0].value="127.0.0.1:21746"
zabbix.macros[0].description="ExporterTool接口URL"

zabbix.items[0].name="master-prometheus-metadata"
zabbix.items[0].key="master.prometheus[{$EXPORTTOOL_URL}]"
zabbix.items[0].type="ZABBIX_ACTIVE"
zabbix.items[0].value_type="TEXT"
zabbix.items[0].delay="5m"
zabbix.items[0].history="30d"
zabbix.items[0].trends="0"
zabbix.items[0].appName="Prometheus"
```

### 业务监控项配置（各组件维护）

**文件路径**：`src/main/resources/zabbix/{serviceName}_business_template.properties`

```properties
zabbix.template="alarm_template"
zabbix.template.name="Alarm Business Template"
zabbix.template.version="5.0"
zabbix.groups[0].name="business"
zabbix.applications[0].name="alarm"

# 关键：声明依赖主监控项模板
zabbix.templates[0].name="master_prometheus_business_template"

# 业务监控项（引用主监控项）
zabbix.items[0].name="告警证据下载成功量"
zabbix.items[0].key="alarm_evidence_download_success"
zabbix.items[0].type="DEPENDENT"
zabbix.items[0].value_type="FLOAT"
zabbix.items[0].master_item="master.prometheus[{$EXPORTTOOL_URL}]"
zabbix.items[0].preprocessing_type="PROMETHEUS_PATTERN"
zabbix.items[0].preprocessing_params="alarm_evidence_download{taskStatus=\"success\"}"
zabbix.items[0].appName="alarm"
```

## 🎯 核心特性说明

### 1. 智能依赖识别

插件自动识别 `zabbix.templates[0].name` 配置，在生成XML时添加模板依赖声明：

```xml
<templates>
    <template>
        <name>s17_prometheus_template</name>
    </template>
</templates>
```

### 2. 自动扫描master文件（向后兼容）

当发布业务模板时，插件支持两种模式：

**推荐模式（主从分离）**：
- 各组件只维护业务监控项配置文件
- 主监控项由运维统一维护到NextCloud
- 插件只处理业务模板

**兼容模式（自动扫描）**：
- 如果同级目录包含`master`关键字的properties文件
- 插件会自动识别并一起处理
- 按正确顺序转换和上传（主监控项优先）

### 3. 版本号自动读取

优先级顺序：
1. 插件配置中的 `version` 设置
2. 项目根目录 `pom.xml` 中的 `<version>` 标签
3. 默认值 `1.0.0`

## ❓ 常见问题

### Q1: 如何创建NextCloud应用专用密码？

1. 登录NextCloud
2. 点击右上角头像 → 设置
3. 左侧菜单 → 安全
4. 找到"应用专用密码"部分
5. 输入名称（如：Zabbix Template Publisher）
6. 点击"创建新应用专用密码"
7. 复制生成的密码（格式：xxxxx-xxxxx-xxxxx-xxxxx-xxxxx）

### Q2: 为什么上传失败提示401错误？

- 检查用户名是否正确
- 确认使用的是**应用专用密码**，而不是登录密码
- 检查NextCloud URL是否正确（不要有多余的斜杠）

### Q3: 如何检查模板是否成功导入Zabbix？

1. 登录Zabbix → 配置 → 模板
2. 搜索模板名称（如：`alarm_template`）
3. 查看模板详情，检查监控项和发现规则

### Q4: 插件在哪里显示执行进度？

执行时会在Cursor右下角显示通知弹窗，展示：
- 读取配置
- 解析配置文件
- 转换为XML格式
- 上传到NextCloud
- 导入到Zabbix测试环境
- 完成

### Q5: 如何查看详细的执行日志？

1. 按 `Ctrl/Cmd + Shift + U` 打开输出面板
2. 在右上角下拉菜单中选择 "Zabbix Template Publisher"
3. 查看详细日志

## 📖 相关文档

- [完整使用说明](doc/cursor-plugin-guide.md)
- [配置参数参考](doc/configuration-reference.md)
- [Properties到XML转换对照表](doc/examples/CONVERSION_MAPPING.md)
- [常见问题FAQ](doc/faq.md)
- [故障排查指南](doc/troubleshooting.md)
- [NextCloud认证配置指南](doc/nextcloud-auth-guide.md) 🆕
- [NextCloud分享链接功能](doc/nextcloud-share-links.md) 🆕
- [更新日志](doc/update-log.md) 🆕

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 🔗 链接

- GitHub: [zabbix-template-publisher-cursor](https://github.com/chengang-97/zabbix-template-publisher-cursor)
- 文档: [完整文档](doc/README.md)

---

**版本**: 1.0.0  
**最后更新**: 2025-10-18

