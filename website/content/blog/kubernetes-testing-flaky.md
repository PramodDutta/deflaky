---
title: "Flaky Tests in Kubernetes Environments: Pods, Services, and Network Issues"
description: "A deep-dive guide to diagnosing and fixing flaky tests in Kubernetes environments. Covers pod startup timing, service discovery delays, network policies, resource quotas, ephemeral storage issues, and test environment provisioning strategies for reliable CI/CD."
date: "2026-04-13"
slug: "kubernetes-testing-flaky"
keywords:
  - kubernetes flaky tests
  - k8s testing issues
  - kubernetes ci testing
  - container orchestration testing
  - k8s test environment
  - kubernetes pod startup
  - kubernetes service discovery
  - kubernetes network testing
  - kubernetes resource quotas
  - kubernetes test provisioning
author: "Pramod Dutta"
---

# Flaky Tests in Kubernetes Environments: Pods, Services, and Network Issues

Kubernetes has become the standard platform for deploying and scaling applications, and increasingly, for running CI/CD pipelines and test environments. But teams that move their test infrastructure to Kubernetes quickly discover a new dimension of flakiness. Tests that were rock-solid on single machines start failing intermittently when running inside pods, communicating across services, and competing for cluster resources.

Kubernetes flaky tests are different from application-level flakiness. They stem from the distributed systems primitives that make Kubernetes powerful: eventual consistency, pod scheduling, service discovery, network policies, and resource management. Understanding these mechanisms is essential to building reliable test environments on Kubernetes.

This guide covers every major source of kubernetes flaky tests and provides proven patterns to eliminate them.

## Pod Startup Timing: The Silent Killer

The most common source of kubernetes flaky tests is the assumption that pods are immediately ready after creation. Kubernetes pods go through multiple phases before they can serve traffic, and tests that do not account for this lifecycle will fail intermittently.

### The Pod Lifecycle

A pod transitions through these states: Pending, Running, Ready. The gap between "Running" and "Ready" is where most flakiness lives:

1. **Pending**: Pod is scheduled but containers have not started
2. **Running**: Containers are running but may not be accepting connections
3. **Ready**: Readiness probes pass, pod is added to service endpoints

```yaml
# A properly configured readiness probe prevents premature traffic
apiVersion: v1
kind: Pod
metadata:
  name: test-api
spec:
  containers:
    - name: api
      image: myapp:latest
      readinessProbe:
        httpGet:
          path: /health
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 3
        failureThreshold: 3
      startupProbe:
        httpGet:
          path: /health
          port: 8080
        failureThreshold: 30
        periodSeconds: 2
```

### Waiting for Pod Readiness in Tests

Never assume a pod is ready just because `kubectl apply` returned successfully:

```bash
#!/bin/bash
# wait-for-pod.sh - Reliable pod readiness check

NAMESPACE=$1
LABEL_SELECTOR=$2
TIMEOUT=${3:-120}

echo "Waiting for pods with selector '$LABEL_SELECTOR' in namespace '$NAMESPACE'..."

# Wait for at least one pod to exist
SECONDS=0
until kubectl get pods -n "$NAMESPACE" -l "$LABEL_SELECTOR" -o name 2>/dev/null | grep -q pod; do
  if [ $SECONDS -ge $TIMEOUT ]; then
    echo "ERROR: No pods found within ${TIMEOUT}s"
    kubectl get pods -n "$NAMESPACE" -l "$LABEL_SELECTOR" -o wide
    exit 1
  fi
  sleep 2
done

# Wait for all pods to be ready
kubectl wait pods \
  -n "$NAMESPACE" \
  -l "$LABEL_SELECTOR" \
  --for=condition=Ready \
  --timeout="${TIMEOUT}s"

EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "ERROR: Pods not ready within ${TIMEOUT}s"
  kubectl describe pods -n "$NAMESPACE" -l "$LABEL_SELECTOR"
  exit 1
fi

echo "All pods ready"
```

### Init Containers and Startup Order

Applications that depend on databases or message queues often use init containers to wait for dependencies. Flakiness occurs when init containers have insufficient timeouts:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-app
spec:
  initContainers:
    - name: wait-for-db
      image: busybox:1.36
      command:
        - sh
        - -c
        - |
          echo "Waiting for PostgreSQL..."
          until nc -z postgres-service 5432; do
            echo "PostgreSQL not ready, retrying in 2s..."
            sleep 2
          done
          echo "PostgreSQL is ready"
    - name: run-migrations
      image: myapp:latest
      command: ["npm", "run", "migrate"]
      env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
  containers:
    - name: app
      image: myapp:latest
```

## Service Discovery Delays

Kubernetes services provide stable network endpoints for pods, but service discovery is eventually consistent. When a pod becomes ready, it takes time for the Endpoints controller to update, for kube-proxy to program iptables rules, and for DNS caches to refresh. This delay is a major source of kubernetes flaky tests.

### The DNS Cache Problem

By default, CoreDNS caches records for 30 seconds. If your test creates a new service and immediately tries to resolve it, DNS may not have propagated:

```python
# FLAKY: Immediate DNS resolution after service creation
import subprocess
import requests

def test_new_service():
    # Create the service
    subprocess.run(["kubectl", "apply", "-f", "test-service.yaml"], check=True)

    # This may fail because DNS hasn't propagated
    response = requests.get("http://my-test-service.default.svc.cluster.local:8080/health")
    assert response.status_code == 200
```

```python
# STABLE: Retry with backoff for DNS propagation
import subprocess
import requests
from tenacity import retry, stop_after_delay, wait_exponential

def test_new_service():
    subprocess.run(["kubectl", "apply", "-f", "test-service.yaml"], check=True)

    # Wait for the service endpoints to be populated
    wait_for_endpoints("default", "my-test-service")

    # Retry HTTP calls to handle DNS propagation delay
    response = call_service_with_retry("http://my-test-service.default.svc.cluster.local:8080/health")
    assert response.status_code == 200

@retry(stop=stop_after_delay(60), wait=wait_exponential(min=1, max=10))
def call_service_with_retry(url):
    return requests.get(url, timeout=5)

def wait_for_endpoints(namespace, service_name, timeout=60):
    """Wait until the service has at least one ready endpoint."""
    import time
    import json

    start = time.time()
    while time.time() - start < timeout:
        result = subprocess.run(
            ["kubectl", "get", "endpoints", service_name, "-n", namespace, "-o", "json"],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            endpoints = json.loads(result.stdout)
            subsets = endpoints.get("subsets", [])
            if subsets and subsets[0].get("addresses"):
                return
        time.sleep(2)
    raise TimeoutError(f"Service {service_name} has no ready endpoints after {timeout}s")
```

### Service Mesh Complications

If you use a service mesh like Istio or Linkerd, sidecar proxy initialization adds another layer of timing complexity. The application container may be ready before the sidecar is, causing network requests to fail:

```yaml
# Ensure sidecar is ready before the application starts
apiVersion: v1
kind: Pod
metadata:
  annotations:
    proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
spec:
  containers:
    - name: app
      image: myapp:latest
```

## Network Policies and Connectivity Failures

Kubernetes network policies can silently block test traffic. When tests work in a permissive development cluster but fail in a locked-down CI cluster, network policies are usually the culprit.

### Debugging Network Policy Issues

```bash
# Check if any network policies exist in the test namespace
kubectl get networkpolicies -n test-namespace

# Describe policies to understand what traffic is allowed
kubectl describe networkpolicy -n test-namespace

# Test connectivity between pods directly
kubectl exec -n test-namespace test-pod -- \
  wget -qO- --timeout=5 http://target-service:8080/health
```

### Creating Test-Friendly Network Policies

```yaml
# Allow all traffic within the test namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-test-namespace-internal
  namespace: test-namespace
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              purpose: testing
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              purpose: testing
    - to: # Allow DNS resolution
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
```

## Resource Quotas and Limits

Resource constraints are a subtle but devastating source of kubernetes flaky tests. When pods hit CPU or memory limits, they get throttled or killed, causing tests to timeout or crash unpredictably.

### CPU Throttling

CPU limits in Kubernetes use CFS (Completely Fair Scheduler) throttling. A pod with a 500m CPU limit can be throttled even when the node has spare capacity, causing latency spikes in your tests:

```yaml
# FLAKY: Tight CPU limits cause throttling
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 200m      # Will be throttled aggressively
    memory: 256Mi

# STABLE: Generous limits for test workloads
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m     # Allow bursting for test startup
    memory: 1Gi
```

Monitor throttling to detect this issue:

```bash
# Check if pods are being CPU-throttled
kubectl top pods -n test-namespace

# Get detailed resource usage from container runtime
kubectl exec -n test-namespace test-pod -- \
  cat /sys/fs/cgroup/cpu/cpu.stat
# Look for: nr_throttled and throttled_time
```

### OOMKilled Pods

Tests that consume more memory than their limit are killed by the OOM killer. The test runner reports this as a crash or timeout rather than a memory error:

```bash
# Check for OOMKilled events
kubectl get events -n test-namespace --field-selector reason=OOMKilling

# Check pod restart reasons
kubectl get pods -n test-namespace -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[*].lastState.terminated.reason}{"\n"}{end}'
```

### ResourceQuota Exhaustion

Namespace-level ResourceQuotas can prevent test pods from being created when quotas are exhausted by previous test runs that did not clean up:

```yaml
# Set reasonable quotas for test namespaces
apiVersion: v1
kind: ResourceQuota
metadata:
  name: test-quota
  namespace: test-namespace
spec:
  hard:
    pods: "50"
    requests.cpu: "10"
    requests.memory: "20Gi"
    limits.cpu: "20"
    limits.memory: "40Gi"
    persistentvolumeclaims: "10"
```

```bash
# Monitor quota usage to detect exhaustion
kubectl describe resourcequota -n test-namespace
```

## Ephemeral Storage and Volume Issues

Tests that write to disk can encounter ephemeral storage limits, volume mounting delays, and permission issues that manifest as intermittent failures.

### Ephemeral Storage Limits

```yaml
resources:
  requests:
    ephemeral-storage: 1Gi
  limits:
    ephemeral-storage: 5Gi  # Allow space for test artifacts, logs, screenshots
```

### PersistentVolumeClaim Timing

PVCs are not instantly available. Tests that expect immediate access to persistent storage will fail when volume provisioning is slow:

```bash
# Wait for PVC to be bound before running tests
kubectl wait pvc/test-data \
  -n test-namespace \
  --for=jsonpath='{.status.phase}'=Bound \
  --timeout=120s
```

## Test Environment Provisioning Patterns

The most reliable approach to kubernetes ci testing is to provision isolated, ephemeral environments for each test run.

### Namespace-Per-Test-Run Pattern

```bash
#!/bin/bash
# provision-test-env.sh

RUN_ID=$(date +%s)-$(head -c 4 /dev/urandom | xxd -p)
NAMESPACE="test-${RUN_ID}"

# Create isolated namespace
kubectl create namespace "$NAMESPACE"
kubectl label namespace "$NAMESPACE" purpose=testing

# Deploy application stack
kubectl apply -n "$NAMESPACE" -f k8s/test-environment/

# Wait for all deployments to be ready
kubectl wait deployment --all \
  -n "$NAMESPACE" \
  --for=condition=Available \
  --timeout=300s

# Run tests
TEST_NAMESPACE="$NAMESPACE" npm test
EXIT_CODE=$?

# Cleanup
kubectl delete namespace "$NAMESPACE" --wait=false

exit $EXIT_CODE
```

### Using Kind or k3s for CI

Instead of using a shared cluster, spin up a dedicated lightweight cluster for each CI run:

```yaml
# .github/workflows/k8s-tests.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create Kind cluster
        uses: helm/kind-action@v1
        with:
          cluster_name: test-cluster
          config: kind-config.yaml

      - name: Build and load test images
        run: |
          docker build -t myapp:test .
          kind load docker-image myapp:test --name test-cluster

      - name: Deploy test environment
        run: |
          kubectl apply -f k8s/test/
          kubectl wait deployment --all --for=condition=Available --timeout=300s

      - name: Run tests
        run: npm run test:integration

      - name: Collect diagnostics on failure
        if: failure()
        run: |
          kubectl get pods -A -o wide
          kubectl describe pods -A
          kubectl logs -l app=myapp --tail=100
```

### Helm-Based Test Environments

For complex applications, use Helm to template your test environment:

```bash
# Deploy a test environment with specific configuration
helm install test-env ./charts/myapp \
  --namespace test \
  --set replicaCount=1 \
  --set image.tag=test-$(git rev-parse --short HEAD) \
  --set database.enabled=true \
  --set database.persistence.enabled=false \
  --set resources.requests.cpu=500m \
  --set resources.requests.memory=512Mi \
  --wait \
  --timeout 5m

# Run tests against the environment
TEST_URL="http://test-env-myapp.test.svc.cluster.local" npm test

# Cleanup
helm uninstall test-env --namespace test
```

## Diagnosing Kubernetes-Specific Flakiness

When you suspect kubernetes flaky tests, use this diagnostic approach:

### Step 1: Check Pod Events

```bash
# Get events sorted by time
kubectl get events -n test-namespace \
  --sort-by='.lastTimestamp' \
  --field-selector type!=Normal
```

### Step 2: Check Node Pressure

```bash
# Check if nodes are under resource pressure
kubectl describe nodes | grep -A 5 "Conditions:"

# Check for node-level issues
kubectl get nodes -o custom-columns=\
  NAME:.metadata.name,\
  CPU:.status.capacity.cpu,\
  MEMORY:.status.capacity.memory,\
  DISK-PRESSURE:.status.conditions[?(@.type=="DiskPressure")].status,\
  MEMORY-PRESSURE:.status.conditions[?(@.type=="MemoryPressure")].status,\
  PID-PRESSURE:.status.conditions[?(@.type=="PIDPressure")].status
```

### Step 3: Check Container Logs

```bash
# Get logs from all containers in a pod (including init containers)
kubectl logs test-pod -n test-namespace --all-containers --previous

# Stream logs during test execution
kubectl logs -f -l app=myapp -n test-namespace --all-containers
```

### Step 4: Check DNS Resolution

```bash
# Test DNS from within the cluster
kubectl run dns-test --rm -it --restart=Never \
  --image=busybox:1.36 -- \
  nslookup myservice.test-namespace.svc.cluster.local
```

## Best Practices Summary

To minimize kubernetes flaky tests in your CI/CD pipeline:

1. **Always wait for readiness**: Never assume pods are ready after creation. Use `kubectl wait` with readiness conditions.
2. **Use ephemeral namespaces**: Isolate each test run in its own namespace to prevent state leakage.
3. **Set generous resource limits**: Test workloads are bursty. Allow headroom for startup and peak usage.
4. **Account for DNS propagation**: Use retry logic when connecting to newly created services.
5. **Collect diagnostics on failure**: Capture pod events, logs, and resource usage when tests fail.
6. **Prefer lightweight clusters**: Use Kind or k3s in CI instead of shared production-like clusters.
7. **Clean up aggressively**: Delete test namespaces and resources after every run to prevent quota exhaustion.

## Automate Flaky Test Detection in Kubernetes

Kubernetes adds layers of complexity to test execution that make manual flaky test detection nearly impossible. When failures can originate from your application, the test framework, the container runtime, the network, or the cluster scheduler, you need automated analysis to identify patterns and root causes. DeFlaky monitors your test runs across kubernetes ci testing environments, correlates failures with infrastructure events, and identifies which tests are genuinely flaky versus which are failing due to environment instability.

Start monitoring your Kubernetes test suite:

```bash
npx deflaky run
```

DeFlaky tracks test results over time, detects kubernetes flaky tests caused by infrastructure instability versus application bugs, and provides actionable remediation steps so your team can ship with confidence regardless of the complexity of your deployment platform.
