# 开发者指南

本文档说明如何构建、测试、打包和发布Zabbix Template Publisher插件。

## 📋 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Visual Studio Code 或 Cursor
- Git

## 🔧 开发环境设置

### 1. 克隆仓库

```bash
git clone https://github.com/chengang-97/zabbix-template-publisher-cursor.git
cd zabbix-template-publisher-cursor
```

### 2. 安装依赖

```bash
npm install
```

### 3. 编译TypeScript

```bash
npm run compile
```

或者启动监听模式（自动重新编译）：

```bash
npm run watch
```

## 🚀 运行和调试

### 方式1: 使用F5调试

1. 在VS Code/Cursor中打开项目
2. 按 `F5` 启动调试
3. 会打开一个新的扩展开发主机窗口
4. 在新窗口中测试插件功能

### 方式2: 使用命令行

```bash
npm run compile
code --extensionDevelopmentPath=$PWD
```

## 🧪 测试

### 运行测试（未来实现）

```bash
npm test
```

### 手动测试清单

- [ ] 配置NextCloud连接
- [ ] 选择properties文件发布
- [ ] 验证XML文件生成
- [ ] 验证NextCloud上传
- [ ] 验证Zabbix导入
- [ ] 测试错误处理
- [ ] 测试进度提示

## 📦 打包发布

### 安装打包工具

```bash
npm install -g @vscode/vsce
```

### 打包为VSIX

```bash
vsce package
```

这会生成 `zabbix-template-publisher-{version}.vsix` 文件。

### 发布到市场（可选）

```bash
vsce publish
```

## 🗂️ 项目结构

```
zabbix-template-publisher-cursor/
├── src/                          # 源代码
│   ├── extension.ts             # 插件入口
│   ├── parsers/                 # 解析器
│   │   └── propertiesParser.ts # Properties解析器
│   ├── converters/              # 转换器
│   │   └── xmlConverter.ts     # XML转换器
│   ├── clients/                 # API客户端
│   │   ├── nextCloudClient.ts  # NextCloud客户端
│   │   └── zabbixClient.ts     # Zabbix客户端
│   ├── utils/                   # 工具类
│   │   └── pomReader.ts        # POM读取器
│   └── types/                   # 类型定义
│       └── zabbix.ts           # Zabbix类型
├── out/                         # 编译输出（自动生成）
├── doc/                         # 文档
│   └── examples/               # 示例文件
├── package.json                # 插件配置
├── tsconfig.json               # TypeScript配置
├── .vscodeignore              # 打包忽略文件
└── README.md                  # 主文档
```

## 🔍 代码质量

### 类型检查

```bash
npm run compile
```

TypeScript编译器会检查类型错误。

### 代码规范（未来实现）

```bash
npm run lint
```

## 📝 提交代码

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范：

```
feat: 添加新功能
fix: 修复Bug
docs: 文档更新
style: 代码格式调整
refactor: 重构代码
test: 添加测试
chore: 构建或辅助工具变动
```

示例：

```bash
git commit -m "feat: 添加模板依赖关系自动识别"
git commit -m "fix: 修复NextCloud上传路径错误"
git commit -m "docs: 更新配置参数说明"
```

## 🐛 调试技巧

### 1. 查看输出日志

在扩展开发主机中：
- `Ctrl/Cmd + Shift + U` 打开输出面板
- 选择 "Extension Host" 查看日志

### 2. 设置断点

在 `.ts` 文件中设置断点，按F5调试时会自动命中。

### 3. 查看变量

在调试时使用：
- `console.log()` 输出到控制台
- 调试面板查看变量值
- 调试控制台执行表达式

## 🔧 常见问题

### Q: 编译失败怎么办？

```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install
npm run compile
```

### Q: 调试时插件不生效？

1. 确保已编译：`npm run compile`
2. 重新加载窗口：`Ctrl/Cmd + Shift + P` → "Reload Window"
3. 检查扩展主机的输出日志

### Q: 如何更新依赖？

```bash
npm update
npm outdated  # 查看过期的包
```

## 📦 打包发布到OpenVSX

### 准备工作

1. **生成图标**（如果还没有）

```bash
# 方法A: 自动生成（推荐）
npm install sharp --save-dev
npm run generate-icon

# 方法B: 在线转换
# 访问 https://cloudconvert.com/svg-to-png
# 上传 icon.svg，设置尺寸为 128x128
# 下载为 icon.png
```

2. **更新版本号**

在 `package.json` 中更新版本号：
```json
{
  "version": "2.0.0"
}
```

3. **更新CHANGELOG**

在 `CHANGELOG.md` 中记录本次更新的内容。

4. **检查清单**

- ✅ `icon.png` 存在且尺寸正确（128x128）
- ✅ `package.json` 中有 `"icon": "icon.png"`
- ✅ 所有TypeScript代码编译成功
- ✅ 没有linter错误
- ✅ README.md 内容完整
- ✅ CHANGELOG.md 已更新

### 打包VSIX

```bash
# 安装打包工具
npm install -g @vscode/vsce

# 打包
vsce package
```

这会生成 `zabbix-template-publisher-{version}.vsix` 文件。

### 发布到OpenVSX

1. **创建OpenVSX账号**

访问 https://open-vsx.org/ 注册账号

2. **获取Access Token**

- 登录OpenVSX
- 进入用户设置 → Access Tokens
- 创建新的Personal Access Token
- 保存token（只显示一次）

3. **使用ovsx CLI发布**

```bash
# 安装ovsx CLI
npm install -g ovsx

# 发布（首次需要登录）
ovsx publish -p <your-access-token>

# 或者使用环境变量
export OVSX_PAT=<your-access-token>
ovsx publish
```

4. **发布成功**

发布成功后，扩展将在几分钟内出现在OpenVSX市场：
https://open-vsx.org/extension/shon-chen/zabbix-template-publisher

### 发布检查清单

- [ ] 版本号已更新
- [ ] CHANGELOG已更新
- [ ] 代码已编译且无错误
- [ ] VSIX文件已生成
- [ ] 已测试VSIX安装和功能
- [ ] 已发布到OpenVSX
- [ ] 已在OpenVSX市场验证

## 📚 相关资源

### VSCode/Cursor扩展开发
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

### OpenVSX
- [OpenVSX Registry](https://open-vsx.org/)
- [OpenVSX CLI](https://github.com/eclipse/openvsx/wiki/Publishing-Extensions)

### 技术栈
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Axios HTTP Client](https://axios-http.com/docs/intro)
- [xml2js Parser](https://github.com/Leonidas-from-XIV/node-xml2js)

## 🤝 贡献指南

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范：

```
feat: 添加新功能
fix: 修复Bug
docs: 文档更新
style: 代码格式调整
refactor: 重构代码
test: 添加测试
chore: 构建或辅助工具变动
```

### 贡献流程

1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

### 代码审查

所有PR需要经过代码审查才能合并。审查要点：
- 代码质量和规范
- 功能完整性
- 测试覆盖
- 文档完整性

---

**祝你开发愉快！** 🎉

