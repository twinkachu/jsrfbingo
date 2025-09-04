alerts:
- rule: DEPLOYMENT_FAILED
- rule: DOMAIN_FAILED
domains:
- domain: jsrf.bingo
  type: PRIMARY
  zone: jsrf.bingo
features:
- buildpack-stack=ubuntu-22
ingress:
  rules:
  - component:
      name: blog
    match:
      path:
        prefix: /
name: jsrf-bingo-site
region: nyc
static_sites:
- dockerfile_path: ./Dockerfile
  github:
    branch: main
    # this will deploy each time you push (recommended)
    deploy_on_push: true
    repo: jsrfbingo
  name: blog
  output_dir: /workspace/public
  source_dir: /
