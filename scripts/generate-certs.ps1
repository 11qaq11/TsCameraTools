# 生成自签名证书（开发环境使用）

# 生成私钥
openssl genrsa -out certs/key.pem 2048

# 生成证书签名请求
openssl req -new -key certs/key.pem -out certs/csr.pem -subj "/C=CN/ST=Beijing/L=Beijing/O=ThunderSoft/CN=localhost"

# 生成自签名证书（有效期 365 天）
openssl x509 -req -days 365 -in certs/csr.pem -signkey certs/key.pem -out certs/cert.pem

# 清理临时文件
Remove-Item certs/csr.pem

Write-Host "证书已生成到 certs/ 目录"
Write-Host "  - 私钥: certs/key.pem"
Write-Host "  - 证书: certs/cert.pem"
