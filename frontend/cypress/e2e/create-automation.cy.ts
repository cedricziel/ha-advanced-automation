describe("create new automation", () => {
  it("should be able to create a new automation", () => {
    cy.visit("/");

    cy.contains("New Automation").click();

    // see text "Create New Automation"
    cy.contains("Create New Automation");

    // find name text field and type "Test Automation"
    cy.get("#automation-name").type("Test Automation");

    cy.get("#save-automation").click();

    // see text "Automation saved successfully"

    cy.contains("Search automations");

    cy.contains("Test Automation");
  });
});
