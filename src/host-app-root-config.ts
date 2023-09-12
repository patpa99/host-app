import {registerApplication, start} from 'single-spa';
import {
  constructApplications,
  constructRoutes,
  constructLayoutEngine,
} from 'single-spa-layout';
// eslint-disable-next-line node/no-unpublished-import
import {toCSS} from 'cssjson';

// Import from .json file for backend endpoints
import configEndpoints from './assets/configurationEndpoints/configuration.json';

let configRoutes = `
  {
    "mode": "hash",
    "routes": [
      $$$ LAYOUTS $$$
    ]
  }
`;

fetch(configEndpoints.hostAppConfig)
  .then(response => response.json())
  .then(async jsonConfig => {
    // jsonConfig is parsed json object received from url
    const config = jsonConfig.routes;

    let layoutTot = '';
    for (let i = 0; i < config.length; i++) {
      await fetch(config[i].layout)
        .then(response => response.json())
        .then(jsonLayout => {
          // jsonLayout is parsed json object received from url
          let layout = JSON.stringify(jsonLayout.layout);

          // If the path is an empty string the page is a default page
          if (config[i].path === '')
            layout = layout.replace('"path":"$$$ PATH $$$"', '"default":true');
          else layout = layout.replace('$$$ PATH $$$', config[i].path);

          // Replace apps to the paylod "$$$ APP ... $$$"
          for (let j = 0; j < config[i].applications.length; j++) {
            layout = layout.replace(
              '$$$ APP ' + config[i].applications[j].order + ' $$$',
              config[i].applications[j].name
            );
          }
          if (i < config.length - 1) layout += ',';
          layoutTot += layout;

          // To add the imported css of layouts from endpoint (converting the code from json to css), avoiding repetitions
          const hostAppStyle = document.getElementById('hostAppStyle');
          const cssStyle = toCSS(jsonLayout.cssStyle);
          if (!hostAppStyle.innerHTML.includes(cssStyle))
            hostAppStyle.innerHTML += cssStyle;
        })
        .catch(error => {
          // handle errors here
          console.error(error);
        });
    }
    // Replace apps combined with layouts at paylod "$$$ LAYOUTS $$$"
    configRoutes = configRoutes.replace('$$$ LAYOUTS $$$', layoutTot);

    const routes = constructRoutes(JSON.parse(configRoutes));
    const applications = constructApplications({
      routes,
      loadApp({name}) {
        return System.import(name);
      },
    });
    const layoutEngine = constructLayoutEngine({routes, applications});

    applications.forEach(registerApplication);
    layoutEngine.activate();
    start();
  })
  .catch(error => {
    // handle errors here
    console.error(error);
  });
