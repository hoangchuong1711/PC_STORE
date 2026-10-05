window.onload = function () {
  window.ui = SwaggerUIBundle({
    url: "./openapi.yaml",
    dom_id: "#swagger-ui",
    deepLinking: true,
    withCredentials: true,
    displayRequestDuration: true,
    filter: true,
    validatorUrl: null,
    supportedSubmitMethods: ["get", "post", "patch"],
    presets: [SwaggerUIBundle.presets.apis]
  });
};
