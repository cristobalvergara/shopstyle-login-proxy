FROM node
MAINTAINER Cristobal Vergara <cvergara@popsugar.com>

COPY ["index.js", "package.json", "./"]
EXPOSE 6333
RUN npm install q yargs https://cristobalvergara:e8b0209336183a1227d95797498a5680082bda2d@github.com/PopSugar/node-shopstyle-auth-digest-generator.git
ENTRYPOINT ["npm", "start", "--"]
