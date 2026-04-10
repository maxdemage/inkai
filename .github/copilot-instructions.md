# Copilot Instructions

## README Maintenance

Always keep `README.md` and `GUIDE.md` up to date when making changes to the project. This includes:

- Adding or removing commands → update the **Commands** table
- Adding or changing features → update the **Features** list
- Changing setup steps, dependencies, or build process → update **Quick Start**
- Adding new configuration options → document them in the relevant section
- Changing CLI behavior or flags → reflect it in usage examples

When in doubt, re-read `README.md` and `GUIDE.md` after your changes and ask: "Would a new user understand how to use this with the current documentation?" If not, update it.


## Testing

Always run `npm test` after making changes to verify nothing is broken.
