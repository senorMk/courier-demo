// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  hmr: false,
  serverURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
};
