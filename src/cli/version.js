module.exports = function(args, context) {
  const { packageJson } = context;
  console.log(`Chathai version: ${packageJson.version}`);
};