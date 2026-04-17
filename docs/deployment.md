# Deployment

## GitHub Actions

仓库包含两条 workflow：

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

`CI` 会在 `pull_request` 和 `push main` 时执行测试并生成 `build-manifest.json`。

`Deploy` 会在 `push main` 时自动部署到 `production`，也支持手工触发并选择 `staging` / `production`。

## 必需的 GitHub Secrets

根据 Cloudflare 官方 GitHub Actions 文档，CI/CD 至少需要以下 secrets：

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

参考：

- [Cloudflare Workers GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [GitHub Actions secrets CLI](https://docs.github.com/actions/reference/encrypted-secrets?tool=cli)

## 本地检查

可以把本地值放到 `.dev.vars` 或 `.env`，然后执行：

```bash
npm run github:secrets:check
```

如果要把它们推到 GitHub 仓库 secrets：

```bash
npm run github:secrets:sync -- owner/repo
```

脚本会从以下位置按顺序读取：

1. 当前 shell 环境变量
2. `.dev.vars`
3. `.env`

## Cloudflare 资源

当前仓库定义了两个 Wrangler 环境：

- `production`
- `staging`

在 [wrangler.toml](/Users/brilliant/repo/privmsg/wrangler.toml) 中，你仍需填入真实资源：

- `database_id`
- `bucket_name`
- `preview_bucket_name`

这些值不是高敏感密钥，但如果你不想公开暴露，也可以改成只在私有仓库中维护，或由 CI 生成配置文件再部署。

