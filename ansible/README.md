# Ansible - Cửa hàng trực tuyến microservices

Tự động hóa việc chuẩn bị máy chủ và triển khai hệ thống cửa hàng trực tuyến bằng Ansible.

## Cấu trúc

```
ansible/
├── ansible.cfg            # cấu hình mặc định (inventory, interpreter)
├── inventory/hosts.ini    # danh sách máy chủ (nhóm [store])
├── provision.yml          # chuẩn bị máy: common -> docker -> k3s
├── site.yml               # deploy stack bằng docker compose
└── roles/
    ├── common/            # gói cơ bản, múi giờ, firewall
    ├── docker/            # cài Docker Engine + Compose
    ├── k3s/               # cài K3s (Kubernetes bản nhẹ)
    └── jenkins_agent/     # đang phát triển
```

## Yêu cầu

- Ansible 2.14 trở lên (`ansible --version`).
- Máy đích chạy Ubuntu, có SSH và user có quyền `sudo`.

## Cách chạy

1. Sửa `inventory/hosts.ini`, trỏ vào máy đích. Ví dụ máy từ xa:

   ```ini
   [store]
   192.0.2.10 ansible_user=azureuser
   ```

   Chạy ngay trên máy hiện tại thì dùng `localhost ansible_connection=local`.

2. Kiểm tra kết nối và cú pháp:

   ```bash
   cd ansible
   ansible all -m ping
   ansible-playbook provision.yml --syntax-check
   ```

3. Chuẩn bị máy (cài Docker, K3s, firewall):

   ```bash
   ansible-playbook provision.yml -K
   ```

4. Deploy stack microservices:

   ```bash
   ansible-playbook site.yml
   ```

Chạy lại nhiều lần không gây thay đổi nếu máy đã đúng trạng thái (idempotent).

## Các role

| Role | Chức năng |
|------|-----------|
| `common` | Cập nhật gói, cài git/curl/vim/htop/ufw/unzip, đặt múi giờ, bật firewall (mở cổng 22, 3000, 8080) |
| `docker` | Cài Docker Engine và Docker Compose từ repo chính thức, bật dịch vụ |
| `k3s` | Cài K3s nếu chưa có, bật dịch vụ, mở cổng 6443, 80, 443 và cho phép dải pod/service (10.42.0.0/16, 10.43.0.0/16) |
| `jenkins_agent` | Cài Java và kết nối agent với Jenkins (chưa hoàn thành) |

## Lưu ý

- `site.yml` dùng thư mục dự án `/home/azureuser/devops_study` và cần file `.env` có sẵn trong đó.
- Chỉ user có quyền Docker hoặc `sudo` mới chạy được `site.yml` và `provision.yml`.
- Không commit mật khẩu hoặc token vào Git. Dùng `ansible-vault` cho biến nhạy cảm.
- Role `common` bật firewall chỉ cho phép các cổng liệt kê ở trên. Nếu thêm service mới, thêm cổng vào role này.# Ansible - Cửa hàng trực tuyến microservices

Tự động hóa việc chuẩn bị máy chủ và triển khai hệ thống cửa hàng trực tuyến bằng Ansible.


## Cài collection

Chạy một lần trên máy chạy Ansible, vì các role dùng module `ufw` và `timezone` của `community.general`:

```bash
ansible-galaxy collection install -r requirements.yml
```

## Lưu ý bảo mật

- Docker và `ufw`: cổng container publish bằng Docker (ví dụ 5432, 27017, 6379) có thể đi vòng qua luật `ufw`. Nên chặn các cổng này bằng NSG của Azure, hoặc không publish cổng database ra ngoài.
- K3s: script cài không ghim phiên bản theo mặc định. Muốn ghim, đặt biến `k3s_version` theo định dạng `vX.Y.Z+k3s1`, ví dụ `-e k3s_version=vX.Y.Z+k3s1`.
- K3s: file kubeconfig đang để quyền 644 (mọi user trên máy đều đọc được). Chấp nhận cho môi trường học tập, nên siết lại khi dùng thật.
