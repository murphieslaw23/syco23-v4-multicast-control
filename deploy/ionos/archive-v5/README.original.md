# SYCO23 IONOS Runtime Deployment

This bundle installs the persistent SYCO23 control runtime at
`/opt/syco23-multicast-control` and publishes it through Caddy at
`https://api.syco23.org`.

The installer inventories the host before mutation, aborts when ports 80/443
are occupied, preserves an active UFW configuration, stores secrets with mode
`0600`, keeps SQLite in a named Docker volume, and starts in safe `virtual`
media mode.

## 1. Upload

Download this bundle, then upload it from an SSH-enabled computer:

```bash
scp SYCO23-IONOS-Deploy-Bundle.zip root@87.106.219.4:/root/
```

## 2. Install from the VPS

Open the IONOS web console or SSH from your own computer:

```bash
cd /root
unzip SYCO23-IONOS-Deploy-Bundle.zip
cd SYCO23-IONOS-Deploy-Bundle
chmod 700 install.sh
./install.sh
```

If IONOS Cloud Firewall is enabled, allow inbound TCP 80 and 443 plus UDP 443.
Keep TCP 22 restricted to your administrative IP whenever possible.

## 3. Verify

```bash
curl -fsS https://api.syco23.org/api/health
docker ps --filter name=syco23_multicast_control
cat /root/syco23-runtime-credentials.txt
```

The credential file is readable only by root. Do not paste it into tickets or
chat. After the runtime is healthy, the Vercel UI must be rebuilt with:

```text
VITE_RUNTIME_URL=https://api.syco23.org
```

## 4. Enable real FFmpeg workers later

Leave `MEDIA_MODE=virtual` until provider credentials and sandbox start/stop
tests pass. Then edit:

```text
/opt/syco23-multicast-control/shared/.env
```

Set destination keys, change `MEDIA_MODE=ffmpeg`, and recreate only this stack:

```bash
cd /opt/syco23-multicast-control/current
docker compose -f docker-compose.ionos.yml up -d
```

## Remove the temporary Codex public key

The current ChatGPT environment cannot originate SSH, so the added key is not
usable here. Remove it after deployment:

```bash
sed -i '/codex-syco23-ionos-2026-07-21/d' /root/.ssh/authorized_keys
```

