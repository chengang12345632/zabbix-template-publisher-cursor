# 发布到 openVSX 指南

## 📋 发布前准备

### 1. 生成图标

#### 方法A: 自动生成（推荐）

```bash
# 安装依赖
npm install sharp --save-dev

# 生成PNG图标
npm run generate-icon
```

#### 方法B: 在线转换

1. 访问 https://cloudconvert.com/svg-to-png
2. 上传 `icon.svg`
3. 设置尺寸为 128x128
4. 下载为 `icon.png` 保存到项目根目录

### 2. 预览图标

在浏览器中打开 `icon-preview.html` 检查图标效果。

### 3. 编译项目

```bash
npm install
npm run compile
```

### 4. 检查清单

- ✅ `icon.png` 存在且尺寸正确（128x128）
- ✅ `package.json` 中有 `"icon": "icon.png"`
- ✅ 所有TypeScript代码编译成功
- ✅ 没有linter错误
- ✅ README.md 内容完整
- ✅ CHANGELOG.md 已更新

## 📦 打包扩展

### 安装 vsce

```bash
npm install -g @vscode/vsce
```

### 打包 VSIX

```bash
vsce package
```

这会生成 `zabbix-template-publisher-1.0.0.vsix` 文件。

## 🚀 发布到 openVSX

### 1. 注册账号

访问 https://open-vsx.org/ 并注册账号。

### 2. 创建 Access Token

1. 登录 openVSX
2. 进入 **User Settings** → **Access Tokens**
3. 点击 **Generate New Token**
4. 复制生成的 token

### 3. 使用 ovsx 发布

```bash
# 安装 ovsx CLI
npm install -g ovsx

# 登录（使用你的 Personal Access Token）
ovsx publish -p <YOUR_ACCESS_TOKEN>
```

或者直接发布：

```bash
ovsx publish zabbix-template-publisher-1.0.0.vsix -p <YOUR_ACCESS_TOKEN>
```

## 📝 发布信息

在 openVSX 市场上，你的扩展将显示：

### 基本信息
- **名称**: Zabbix Template Publisher
- **标识符**: shon-chen.zabbix-template-publisher
- **版本**: 1.0.0
- **分类**: Other
- **图标**: icon.png (128x128)

### 标签/关键词
- zabbix
- monitoring
- template
- nextcloud
- prometheus

### 描述
> Publish Zabbix monitoring templates from properties to NextCloud and Zabbix

## 🔄 更新版本

当需要发布新版本时：

### 1. 更新版本号

```bash
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0
```

### 2. 更新 CHANGELOG.md

记录新版本的变更内容。

### 3. 重新编译和打包

```bash
npm run compile
vsce package
```

### 4. 发布新版本

```bash
ovsx publish -p <YOUR_ACCESS_TOKEN>
```

## 📊 市场展示优化

### README.md 最佳实践

你的 README.md 应该包含：
- ✅ 清晰的功能介绍
- ✅ 安装步骤
- ✅ 配置说明
- ✅ 使用示例
- ✅ 截图或GIF演示
- ✅ 故障排查

### package.json 优化

```json
{
  "name": "zabbix-template-publisher",
  "displayName": "Zabbix Template Publisher",
  "description": "Publish Zabbix monitoring templates from properties to NextCloud and Zabbix",
  "version": "1.0.0",
  "publisher": "shon-chen",
  "icon": "icon.png",
  "repository": {
    "type": "git",
    "url": "https://github.com/chengang-97/zabbix-template-publisher-cursor.git"
  },
  "bugs": {
    "url": "https://github.com/chengang-97/zabbix-template-publisher-cursor/issues"
  },
  "homepage": "https://github.com/chengang-97/zabbix-template-publisher-cursor#readme",
  "license": "MIT",
  "keywords": [
    "zabbix",
    "monitoring",
    "template",
    "nextcloud",
    "prometheus"
  ]
}
```

## 🎯 推广建议

发布后，可以在以下地方推广：

1. **GitHub**
   - 在仓库 README 添加安装徽章
   - 创建 Release 并附带 VSIX 文件

2. **社区**
   - Zabbix 官方论坛
   - 相关技术博客
   - 团队内部推广

3. **文档**
   - 创建详细的使用文档
   - 录制演示视频
   - 提供示例项目

## 📈 监控统计

发布后，可以在 openVSX 查看：
- 下载次数
- 评分和评论
- 使用统计

## 🔧 常见问题

### Q: 发布失败 - 图标错误

确保 `icon.png` 存在且格式正确：
```bash
file icon.png
# 应显示: icon.png: PNG image data, 128 x 128, ...
```

### Q: 发布失败 - 版本冲突

如果版本号已存在，需要更新版本：
```bash
npm version patch
```

### Q: 如何撤销发布？

openVSX 不支持删除已发布的版本，但可以：
1. 发布新的补丁版本
2. 在新版本的 README 中说明问题
3. 联系 openVSX 管理员

### Q: 如何转移扩展所有权？

在 openVSX User Settings 中可以管理命名空间和所有权。

## 📚 参考资源

- [openVSX Wiki](https://github.com/eclipse/openvsx/wiki)
- [VS Code Extension Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce Documentation](https://github.com/microsoft/vscode-vsce)
- [ovsx CLI](https://github.com/eclipse/openvsx/tree/master/cli)

## ✅ 发布检查表

发布前最后检查：

```
[ ] 图标已生成 (icon.png, 128x128)
[ ] package.json 配置完整
[ ] 代码编译无错误
[ ] README.md 内容完整
[ ] CHANGELOG.md 已更新
[ ] 所有功能测试通过
[ ] 在本地安装测试过 VSIX
[ ] 准备好 Access Token
[ ] 确认版本号正确
[ ] 已提交所有代码到 Git
```

---

**祝发布顺利！** 🎉

如有问题，请查看 [openVSX 文档](https://github.com/eclipse/openvsx/wiki) 或提交 Issue。

