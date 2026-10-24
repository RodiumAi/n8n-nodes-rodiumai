# Security policy

## Supported versions

Security fixes are released for the latest minor version of `n8n-nodes-rodiumai`.

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |

## Reporting a vulnerability

Please do not report security vulnerabilities in public GitHub issues, discussions or pull requests.

Report them privately instead:

1. **GitHub private vulnerability reporting** (preferred): go to the [Security tab](https://github.com/RodiumAi/n8n-nodes-rodiumai/security) of this repository and select **Report a vulnerability**.
2. **Email**: write to [support@rodiumai.io](mailto:support@rodiumai.io) with "Security" in the subject.

Please include:

- the affected version of the package and of n8n;
- a description of the issue and its impact;
- the steps to reproduce it, or a proof of concept;
- any suggested fix, if you have one.

Never include a real RodiumAi API key (`rd_sk_…`) in a report. If a key has been exposed, revoke it in the [RodiumAi dashboard](https://www.rodiumai.io/dashboard) first.

We will acknowledge your report, keep you informed while we investigate, and credit you in the release notes if you wish once a fix is published.

## Scope

This policy covers the code in this repository: the RodiumAi credential and the RodiumAi nodes for n8n.

Vulnerabilities in the RodiumAi API or platform should also be sent to [support@rodiumai.io](mailto:support@rodiumai.io). Vulnerabilities in n8n itself should be reported to n8n, following the [n8n security policy](https://github.com/n8n-io/n8n/security/policy).
