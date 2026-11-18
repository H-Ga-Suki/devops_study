#!/usr/bin/env bash
# Dùng: bluegreen.sh <tên-service> <KEY> <port> <image> [health-path]
set -euo pipefail
NS=shop; NAME=$1; KEY=$2; PORT=$3; IMAGE=$4; HEALTH=${5:-}

ACTIVE=$(kubectl -n $NS get svc $NAME -o jsonpath='{.spec.selector.color}' 2>/dev/null || echo blue)
[ "$ACTIVE" = "blue" ] && IDLE=green || IDLE=blue
echo ">> $NAME: đang chạy=$ACTIVE, triển khai bản mới lên=$IDLE"

export NAME KEY PORT IMAGE COLOR=$IDLE
trap 'echo "!! Lỗi - hủy bản $IDLE, giữ nguyên $ACTIVE"; kubectl -n $NS scale deploy/$NAME-$IDLE --replicas=0 || true' ERR

envsubst < "$(dirname "$0")/../templates/app-deployment.tpl.yaml" | kubectl apply -f -
kubectl -n $NS scale deploy/$NAME-$IDLE --replicas=1
kubectl -n $NS rollout status deploy/$NAME-$IDLE --timeout=180s

if [ -n "$HEALTH" ]; then
  POD=$(kubectl -n $NS get pod -l app=$NAME,color=$IDLE -o jsonpath='{.items[0].metadata.name}')
  kubectl -n $NS exec "$POD" -- wget -qO- -T 5 "http://127.0.0.1:$PORT$HEALTH" >/dev/null
  echo ">> Smoke test OK"
fi

kubectl -n $NS patch svc $NAME -p "{\"spec\":{\"selector\":{\"app\":\"$NAME\",\"color\":\"$IDLE\"}}}"
echo ">> Đã chuyển traffic sang $IDLE"
kubectl -n $NS scale deploy/$NAME-$ACTIVE --replicas=0 2>/dev/null || true
