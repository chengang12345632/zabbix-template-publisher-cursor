# 故障排查指南

## 诊断工具

### 检查配置

1. 在Cursor中打开命令面板：`Cmd/Ctrl + Shift + P`
2. 输入 "Zabbix Template Publisher: Show Configuration"
3. 查看当前配置是否完整

### 查看详细日志

1. 打开输出面板：`Cmd/Ctrl + Shift + U`
2. 选择 "Zabbix Template Publisher" 通道
3. 查看详细执行日志

## 常见错误及解决方案

### 1. pom.xml读取失败

**错误信息**：
```
Cannot read serviceName and version from pom.xml
```

**原因**：
- 项目根目录不存在pom.xml文件
- pom.xml格式错误
- pom.xml缺少artifactId或version标签

**解决方案**：
检查pom.xml文件，确保包含artifactId和version：
```xml
<project>
    <artifactId>your-service-name</artifactId>
    <version>1.0.0</version>
</project>
```

插件会自动读取artifactId作为serviceName。如需自定义version，可在插件设置中配置 `Version`。

---

### 2. NextCloud认证失败

**错误信息**：
```
401 Unauthorized
```

**原因**：
用户名或密码错误

**解决方案**：
- 确认用户名和密码正确
- **必须使用应用专用密码，不能使用登录密码**
- 在NextCloud Web界面重新生成应用专用密码

**获取应用专用密码**：
```
登录 NextCloud 网页版
→ 头像 → 设置（Settings）
→ 安全（Security）
→ 应用密码（App passwords）
→ 输入名称（如：Zabbix Template Publisher）
→ 创建 → 复制密码（格式：xxxxx-xxxxx-xxxxx-xxxxx-xxxxx）
```

---

### 3. NextCloud权限不足

**错误信息**：
```
403 Forbidden
```

**原因**：
用户没有上传权限

**解决方案**：
- 在NextCloud中检查用户权限
- 确认目标目录可写
- 尝试在Web界面手动上传测试
- 联系NextCloud管理员分配写入权限

---

### 4. Zabbix导入失败

**错误信息**：
```
Failed to import template to Zabbix
```

**原因**：
- Zabbix服务器连接失败
- Zabbix认证失败
- 模板格式错误
- 网络不可达

**解决方案**：
- 检查Zabbix服务器地址是否正确
- 确认Zabbix用户名和密码
- 验证生成的XML模板格式
- 尝试在Zabbix Web界面手动导入测试
- 检查防火墙和网络连接

---

### 5. 模板配置文件未找到

**错误信息**：
```
Template configuration file not found
```

**原因**：
`src/main/resources/zabbix/` 目录下找不到配置文件

**解决方案**：
```bash
# 创建配置目录和文件
mkdir -p src/main/resources/zabbix
# 创建主监控项配置（文件名必须包含master）
touch src/main/resources/zabbix/master_prometheus_business_template.properties
# 创建业务监控项配置（文件名根据你的服务名）
touch src/main/resources/zabbix/your-service-name_business_template.properties
```

---

### 6. 插件未响应

**现象**：
点击按钮或执行命令无反应

**解决方案**：
1. 重启Cursor：`Cmd/Ctrl + Shift + P` -> "Reload Window"
2. 检查插件是否正常加载：查看扩展列表
3. 查看Cursor开发者工具：`Help` -> `Toggle Developer Tools`
4. 重新安装插件

---

### 7. 主监控项冲突

**错误信息**：
```
Item with key "master.prometheus[{$EXPORTTOOL_URL}]" already exists
```

**原因**：
多个模板都配置了相同的主监控项key

**解决方案**：
采用"主监控项智能共享"架构：
1. 将主监控项配置独立到 `src/main/resources/zabbix/master_prometheus_business_template.properties` 文件（文件名必须包含master）
2. 业务监控项在 `{serviceName}_business_template.properties` 中配置
3. 插件会自动扫描同级目录的master模板文件并处理：读取主监控项key，检查Zabbix中是否存在
   - 已存在：覆盖更新
   - 不存在：自动导入

详见 [主监控项智能共享架构](../README.md#架构说明)

---

### 8. 监控项显示"不支持"

**错误现象**：
在Zabbix中监控项状态显示"不支持"

**原因**：
- 主机没有链接主监控项模板
- master_item引用错误
- 主监控项模板未导入

**解决方案**：
1. 确认主机已链接 `S17 Prometheus Master Item Template`
2. 检查业务监控项的 `master_item` 配置是否正确：
   ```properties
   zabbix.items[0].master_item="master.prometheus[{$EXPORTTOOL_URL}]"
   ```
3. 确认主监控项模板已在Zabbix中创建

---

### 9. WebDAV连接失败

**错误信息**：
```
WebDAV connection failed
```

**原因**：
- WebDAV用户名配置错误
- NextCloud服务器不可达
- SSL证书问题

**解决方案**：
1. 检查WebDAV文件空间用户名：
   ```
   登录 NextCloud → 文件设置 → WebDAV
   复制显示的用户名（可能与登录用户名不同）
   ```
2. 在插件设置中配置正确的WebDAV用户名
3. 检查NextCloud服务器地址是否可访问
4. 如有SSL证书问题，可在浏览器中先访问NextCloud并信任证书

---

### 10. 发布成功但文件未上传

**现象**：
插件显示发布成功，但NextCloud中找不到文件

**原因**：
- Template Base Path配置错误
- NextCloud目录不存在
- 文件被上传到错误的位置

**解决方案**：
1. 检查插件配置中的 `Template Base Path`
2. 在NextCloud中手动创建根目录：
   ```
   登录 NextCloud → 文件 → 新建文件夹
   创建目录：/云平台开发部/监控模板
   ```
3. 查看插件输出日志确认实际上传路径
4. 如使用自定义路径，确保目录已提前创建

---

## 性能问题

### 发布速度慢

**原因**：
- NextCloud服务器响应慢
- 网络带宽限制
- 模板文件过大

**优化方案**：
- 检查网络连接质量
- 联系NextCloud管理员检查服务器性能
- 简化模板配置，减少不必要的监控项

---

## 获取帮助

如果以上方案无法解决问题：

1. **查看日志**：
   - Cursor输出面板日志
   - NextCloud日志
   - Zabbix日志

2. **检查环境**：
   - Cursor版本
   - 插件版本
   - NextCloud版本
   - Zabbix版本

3. **联系支持**：
   - 提供详细的错误信息
   - 提供相关配置（脱敏后）
   - 提供完整的日志输出

