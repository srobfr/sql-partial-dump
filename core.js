function Core(config) {
  const that = this;
  that.config = config;
  const components = {};
  that.load = async function (componentName) {
    if (Array.isArray(componentName)) {
      return await Promise.all(componentName.map(that.load));
    }

    if (!components[componentName]) {
      const Component = require(config.ioc[componentName]);
      const component = new Component(that);

      if (component.init) await component.init();
      components[componentName] = component;
    }

    return components[componentName];
  };
}

module.exports = Core;