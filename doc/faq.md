# 常见问题 (FAQ)

## NextCloud相关

### Q1: 如何获取NextCloud应用专用密码？

A: 按照以下步骤：
```
1. 登录 NextCloud 网页版
2. 头像 → 设置（Settings）
3. 安全（Security）
4. 应用密码（App passwords）
5. 输入名称（如：Zabbix Template Publisher）
6. 创建 → 复制密码（格式：xxxxx-xxxxx-xxxxx-xxxxx-xxxxx）
```

### Q2: 为什么必须使用应用专用密码？

A: NextCloud WebDAV API 出于安全考虑，要求使用应用专用密码而不是主账户密码。这样即使应用密码泄露，也可以单独撤销而不影响主账户。

### Q3: 如何查看上传到NextCloud的文件？

A: 
1. 登录 NextCloud 网页版
2. 进入文件目录
3. 导航到配置的根目录（默认：`/云平台开发部/监控模板/all_zabbix_template/`）
4. 查看上传的模板文件

如果使用了自定义的 `Template Base Path`，请导航到对应的目录。

### Q4: all_zabbix_template目录和版本目录有什么区别？

A: 
- **版本目录**：按版本号存储，保留历史版本，便于回溯
- **all_zabbix_template目录**：始终保存最新版本，运维人员从此下载用于生产部署

---

## 配置相关

### Q5: serviceName和version可以自定义吗？

A: serviceName会自动从pom.xml的artifactId读取，无需手动配置。version可以在插件设置中配置，如果不配置，插件会自动从pom.xml读取。

### Q6: 如何自定义模板存储路径？

A: 在插件设置中配置 `Template Base Path`：
```
Ctrl + , → 搜索 "Zabbix Template Publisher"
→ Template Base Path: /自定义路径/监控模板
```

注意事项：
- 如果留空或不配置，使用默认值 `/云平台开发部/监控模板`
- 需要提前在NextCloud中手动创建自定义的根目录
- 插件会自动在根目录下创建 `all_zabbix_template` 和 `{version}` 子目录

### Q7: 可以不导入到Zabbix测试环境吗？

A: 可以。在插件设置中将Zabbix配置留空，插件会跳过Zabbix导入步骤，只上传到NextCloud。

---

## 模板相关

### Q8: 模板配置文件支持哪些元素？

A: 支持以下元素：
- 模板基本信息（template、name、version）
- 模板组（groups）
- 应用（applications）
- 宏定义（macros）
- 监控项（items）
- 发现规则（discovery_rules）
- 监控项原型（item_prototype）

详细配置请参考 [配置参数参考手册](configuration-reference.md)

### Q9: 发现规则适合什么场景？与静态监控项有什么区别？

A: **发现规则适合多租户/多实例场景**，核心优势是"配置一次，自动适配所有场景"。

**典型场景对比**：

场景：监控100个租户的订单量
- **静态监控项方式**：
  - 需要配置100个监控项（租户1订单量、租户2订单量...）
  - 新增租户101时，需要修改配置文件，重新发布模板
  - 管理成本高，容易遗漏
  
- **发现规则方式**：
  - 只需配置1个发现规则
  - Zabbix自动为100个租户创建监控项
  - 新增租户101时，无需修改配置，自动生效
  - 租户下线后，监控项自动清理

**适用场景**：
- ✅ SaaS多租户系统
- ✅ 微服务集群（多实例）
- ✅ 多应用环境（按应用ID区分）
- ✅ 需要按多个维度组合监控（租户×应用×类别）

**不适用场景**：
- ❌ 全局性的固定指标（如：系统总QPS）
- ❌ 监控项数量少且固定

---

## 主监控项相关

### Q10: 如何配置业务监控项？是否需要配置主监控项？

A: 采用"主从分离架构"，各组件只需配置业务监控项：

**配置步骤**：

1. **主监控项**：由运维管理人员统一维护到NextCloud，各组件项目中**无需创建**主监控项配置文件

2. 在 `src/main/resources/zabbix/` 创建 `{serviceName}_business_template.properties`（业务监控项配置）：
```properties
zabbix.template="alarm_template"
zabbix.template.name="Alarm Business Template"

# 声明依赖主监控项模板
zabbix.templates[0].name="master_prometheus_business_template"

# 业务监控项配置
zabbix.items[0].type="DEPENDENT"
zabbix.items[0].master_item="master.prometheus[{$EXPORTTOOL_URL}]"
# ... 其他配置
```

3. 使用插件发布业务监控项模板

详见 [主从分离架构](../README.md#架构说明)

### Q11: 如果主监控项配置需要修改怎么办？

A: 由运维人员统一处理：

1. 运维人员更新 `master_prometheus_business_template` 模板
2. 运维人员将更新后的模板上传到NextCloud
3. 运维人员导入到Zabbix生产环境
4. 各业务组件无需任何操作，继续使用原有配置即可

### Q12: 新组件接入时需要什么配置？

A: 只需配置业务监控项：

1. **无需关注主监控项**：主监控项由运维统一维护，已经存在于Zabbix中
2. **创建业务监控项配置**：在 `src/main/resources/zabbix/` 创建 `{serviceName}_business_template.properties`
3. **参考示例**：查看 [业务监控项配置示例](../doc/examples/base_alarm_service_business_template.properties)
4. **发布模板**：使用插件发布即可

---

## 部署相关

### Q13: 如何在生产环境部署模板？

A:
1. 运维人员登录NextCloud
2. 从 `/云平台开发部/监控模板/all_zabbix_template/` 目录下载XML文件
3. 登录Zabbix生产环境
4. 手动导入模板
5. 链接模板到主机

### Q14: 如何批量发布多个项目的模板？

A: 需要分别在每个项目中：
1. 打开项目目录
2. 打开配置文件（`.properties` 或 `.xml`）
3. 执行发布命令

每个项目会根据各自的pom.xml自动识别serviceName生成独立的模板文件。

### Q15: 模板链接后多久能看到数据？

A: 通常需要等待5-10分钟：
- 主监控项默认采集频率为5分钟
- Zabbix需要时间处理和存储数据
- 如果超过10分钟仍无数据，检查：
  - 主机是否链接了主监控项模板
  - 监控项是否显示"不支持"状态
  - ExporterTool服务是否正常

---

## 架构相关

### Q16: 主监控项是如何管理的？

A: 采用运维统一管理机制：

**NextCloud存储**：
- 主监控项文件名：`master_prometheus_business_template.xml`
- 由运维人员统一维护到NextCloud的all_zabbix_template目录
- 各组件发布时不上传主监控项，避免冲突

**Zabbix部署**：
- 由运维人员统一导入到Zabbix生产环境
- 各组件的业务模板依赖此主监控项
- 业务模板可独立导入/更新，不影响主监控项

### Q17: 业务模板必须引用主监控项吗？

A: 是的。所有业务监控项必须设置：

```properties
zabbix.items[x].type="DEPENDENT"
zabbix.items[x].master_item="master.prometheus[{$EXPORTTOOL_URL}]"
```

如果不设置，监控项将无法采集数据。

### Q18: 可以有多个不同的主监控项吗？

A: 可以。如果需要监控不同的数据源：

1. 创建新的主监控项配置文件，如 `s17.prometheus.special.properties`
2. 定义不同的key，如 `s17.prometheus.special[...]`
3. 业务模板引用对应的key

一般情况下，一个主监控项key足够使用。

---

## 其他问题

### Q19: 插件支持离线工作吗？

A: 不支持。插件需要网络连接到NextCloud和Zabbix服务器。编写配置文件可以离线进行，发布时需要联网。

### Q20: 如何更新已发布的模板？

A: 
1. 修改 `.properties` 或 `.xml` 文件
2. 再次执行发布命令
3. 插件会自动覆盖NextCloud上的文件
4. Zabbix测试环境的模板也会自动更新

### Q21: 支持哪些文件格式？

A: 插件支持两种文件格式：

**Properties文件（`.properties`）**：
- 自动转换为XML格式后上传
- 适合配置化的监控项管理
- 支持模板依赖关系自动识别

**XML文件（`.xml`）**：
- 直接上传，无需转换
- 适合直接使用Zabbix导出的模板
- 自动提取模板名称用于Zabbix导入

### Q22: XML文件需要什么格式？

A: XML文件需要是标准的Zabbix模板格式，包含以下基本结构：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<zabbix_export>
    <version>5.0</version>
    <date>2024-01-01T00:00:00Z</date>
    <templates>
        <template>
            <name>your_template_name</name>
            <!-- 其他模板配置 -->
        </template>
    </templates>
</zabbix_export>
```

插件会自动从XML中提取模板名称用于Zabbix导入。

---

更多问题请参考：
- [配置参数参考手册](configuration-reference.md)
- [故障排查指南](troubleshooting.md)
- [Cursor插件使用指南](cursor-plugin-guide.md)

