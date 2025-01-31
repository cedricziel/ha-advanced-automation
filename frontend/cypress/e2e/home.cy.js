it("should load the page", () => {
    cy.visit("/");
    cy.findAllByText(/Home Assistant Advanced Automation/i).should("have.length", 1);
});
