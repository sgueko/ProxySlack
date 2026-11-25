# Security

For a suspected vulnerability, use GitHub's private vulnerability reporting for `sgueko/ProxySlack` once the repository is published. Until then, do not post exploit details publicly; contact the maintainer through a private channel you already trust. Include affected version, impact and reproduction steps, without real credentials or IP addresses.

Release CRX files must be signed with the same private key. `EXTENSION_ID` pins the expected signer. Keep the key outside Git, store a secure backup and restrict file permissions to the owner. Verify GitHub Release hashes and the embedded CRX signature before installation. The Linux installer writes only ProxySlack's external metadata and CRX path; it does not alter managed browser policies.

The extension validates profile hosts and ports and imported JSON, stores no credentials, and uses DOM text nodes for profile data. Network paths can still leak outside browser proxy control as described in [Privacy](PRIVACY.md).
