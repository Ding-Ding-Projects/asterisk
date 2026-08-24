## Installer and deployment integrity

- Replaced fixed package-version assumptions with one explicit version and candidate-commit identity shared by packaging, update metadata, and release publication.
- Made unsigned Squirrel.Windows output fail closed on incomplete `Setup.exe`, `RELEASES`, full-package, generated-delta, digest, or release-identity evidence.
- Required update downloads to have a published SHA-256, joined overlapping checks, preserved verified ready state when Later is selected, and kept the application open when the installer process does not start.
- Replaced script-only SSH deployment with a complete server payload, aligned the service, port, and readiness route, and withheld success until the installed service actually answered.
- Ensured remote staging is removed in all outcomes, deployer running state is cleared in all outcomes, unavailable target routes are not presented as usable, and managed VM removal stops the VM first.
