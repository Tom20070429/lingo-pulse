# Lingo Pulse 傻瓜式部署指南

这套版本使用 GitHub Pages 显示网页，使用 GitHub Actions 每 6 小时尝试更新词库。不需要购买服务器。

## 一、创建 GitHub 仓库

1. 打开 https://github.com/ ，注册并登录。
2. 点击右上角 **+**，选择 **New repository**。
3. Repository name 填 `lingo-pulse`，选择 **Public**，点击 **Create repository**。

## 二、上传网站文件

1. 进入刚创建的仓库，点击 **Add file → Upload files**。
2. 把本文件夹里的所有文件和文件夹拖进去。必须包含：`index.html`、`app.js`、`styles.css`、`data/terms.json`、`scripts/update-terms.mjs`、`scripts/build-site.mjs`、`.github/workflows/update-and-deploy.yml`。
3. 页面底部填写 `initial website upload`，点击 **Commit changes**。

## 三、打开 GitHub Pages

1. 在仓库顶部点击 **Settings**。
2. 左侧点击 **Pages**。
3. 在 **Build and deployment → Source** 选择 **GitHub Actions**。
4. 左侧回到 **Actions → General**，向下找到 **Workflow permissions**，选择 **Read and write permissions**，点击 **Save**。这一步允许自动更新程序把新词存回仓库。
5. 回到仓库，点击顶部 **Actions**。
6. 点击左侧 `Update Lingo Pulse`，再点击右侧 **Run workflow → Run workflow**。
7. 等待绿色勾出现。再回到 **Settings → Pages**，打开 GitHub 显示的网址：`https://你的用户名.github.io/lingo-pulse/`。

## 四、测试自动更新

在 `Actions → Update Lingo Pulse → Run workflow` 手动运行一次。以后 GitHub 会大约每 6 小时自动运行。定时任务可能延迟几分钟，这是正常现象。

## 五、费用和故障

公开仓库、GitHub Pages 和免费额度内的 Actions 不需要购买服务器。自定义域名、私有仓库或超过 Actions 免费额度才可能产生费用。

如果 Actions 显示 `No external update`，说明当时 Reddit 或 Urban Dictionary 无法访问；已有词库不会被清空。新发现的词会显示为“候选”，因为社区释义未经人工审核。
