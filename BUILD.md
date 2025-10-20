# 构建指南

本文档说明如何构建、测试和打包Zabbix Template Publisher插件。

## 📋 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Visual Studio Code 或 Cursor

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

## 📚 相关资源

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## 🤝 贡献指南

1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

---

**祝你开发愉快！** 🎉

