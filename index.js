var http = require('http');
var https = require('https');
var argv = require('yargs')
  .argv;
var Q = require('q');
var DigestGenerator = require('@popsugar/node-shopstyle-auth-digest-generator');
var digestGenerator = new DigestGenerator();

var port = argv.port || argv.p || 6333;

var sessions = {};

var server = http.createServer();

server.listen(port, function(err) {
  if (err) {
    throw err;
  }

  console.log('Server running on port ' + port + '.');

  server.on('request', function(req, res) {
    res.on('error', function(e) {
      console.error('Failure while returning response: ' + e.toString());
    });
    var redirectHeader = req.headers['x-redirect'];
    var pid = req.headers['x-pid'] || 'shopstyle';

    var urlRegexp = /(.+):\/\/(.+):(.+)@(.+)$/;
    var urlRegexpResult = urlRegexp.exec(redirectHeader);
    if (!redirectHeader || !urlRegexpResult) {
      res.statusCode = 400;
      res.statusMessage =
        'The "x-redirect" header was missing or had wrong format in the request. Example: x-redirect: https://cvergara:popsugar@www.shopstyle.com.';
      res.end();

      return;
    }

    var protocol = urlRegexpResult[1];
    var username = urlRegexpResult[2];
    var password = urlRegexpResult[3];
    var host = urlRegexpResult[4];

    var requestedSession = redirectHeader + '?pid=' + pid;

    parseReqBody(req)
      .then(function(body) {
        if (!sessions[requestedSession]) {
          return callLogin(protocol, host, username, password,
              pid)
            .then(function(session) {
              sessions[requestedSession] = session;
              return {
                body: body,
                session: session
              };
            });
        } else {
          return {
            body: body,
            session: sessions[requestedSession] // Cached session
          };
        }

        return body;
      })
      .then(function(params) {
        var body = params.body;
        var session = params.session;

        return callApi(protocol, host, req, res, body, session)
          .then(function(result) {
            var responseBody = result.responseBody;
            var apiRes = result.apiRes;
            res.writeHead(apiRes.statusCode, apiRes.statusMessage,
              apiRes.headers);
            res.write(responseBody);
            res.end();
          })
          .catch(function(err) {
            if (err.statusCode === 401) {
              callLogin(protocol, host, username,
                  password, pid)
                .then(function(session) {
                  sessions[requestedSession] = session;
                  // Try again after refreshing the session
                  return callApi(protocol, host, req, res, body,
                      session)
                    .catch(function(err) {
                      // Give up
                      handleErrors(err, res);
                    });
                });
            }

            handleErrors(err, res);
          });
      })
      .catch(function(err) {
        handleErrors(err, res);
      });
  });
});

function handleErrors(err, res) {
  console.error(err.toString());
  res.statusCode = err.statusCode || 500;
  res.statusMessage = err.toString();
  res.end();
}

function callApi(protocol, host, req, res, body, session) {
  var defer = Q.defer();

  var requester;
  if (protocol === 'https') {
    requester = https;
  } else {
    requester = http;
  }

  var apiHeaders = req.headers;
  if (apiHeaders['x-redirect']) {
    delete apiHeaders['x-redirect'];
  }

  if (!apiHeaders['authorization-date'] || apiHeaders['date']) {
    var now = new Date();
    now = now.toGMTString();
    apiHeaders['authorization-date'] = now;
  }

  var digestTimestamp = apiHeaders['authorization-date'] || apiHeaders['date'];
  var authenticationToken = generateAccessToken(session, req.method, req.url,
    body, digestTimestamp);

  apiHeaders.authorization = authenticationToken;

  var apiRequest = {
    protocol: protocol + ":",
    host: host,
    method: req.method,
    path: req.url,
    rejectUnauthorized: false,
    headers: apiHeaders
  };

  var responseBody = "";
  var apiReq = requester.request(apiRequest, function(apiRes) {
    apiRes.on('error', function(e) {
      console.error('Failure while reading response from API: ' + e.toString());
      throw e;
    });
    if (apiRes.statusCode >= 400) {
      var error = new Error('Bad request or auth*. Status: ' + apiRes.statusCode +
        ". statusMessage: " + apiRes.statusMessage);
      error.statusCode = apiRes.statusCode;
      defer.reject(error);
    }
    apiRes.setEncoding('utf8');
    apiRes.on('data', function(data) {
      responseBody += data;
    });
    apiRes.on('end', function() {
      defer.resolve({
        apiRes: apiRes,
        responseBody: responseBody
      });
    });
  });

  apiReq.on('error', function(e) {
    console.error('Failure while calling API: ' + e.toString());
    defer.reject(e);
  });

  if (body && body.length) {
    apiReq.write(body);
  }
  apiReq.end();

  return defer.promise;
}

function generateAccessToken(session, method, url, body, digestTimestamp) {
  var token = 'PopSugar userId=' + session.user.id;
  token += ', loginTimestamp=' + session.loginTimestamp;
  var request = digestGenerator.createRequest(method, url, body);
  var digest = digestGenerator.generateDigest(request, digestTimestamp,
    session.loginToken);
  token += ', digest=' + digest;
  token += ', version=0';

  return token;

}

function callLogin(protocol, host, username, password, pid) {
  var body = {
    password: password
  };

  if (isValidEmail(username)) {
    body.email = username;
  } else {
    body.handle = username;
  }

  body = JSON.stringify(body);

  var loginReqDefer = Q.defer();
  var buffer = "";
  var loginReq = https.request({
    protocol: "https:",
    host: host,
    rejectUnauthorized: false,
    method: "POST",
    path: "/api/v2/login?pid=" + pid +
      "&format=json&includeCookie=false&track=false&ugcCounts=false",
    headers: {
      "content-type": "application/json"
    }
  }, function(loginRes) {
    loginRes.on('error', function(e) {
      console.error('Failure while reading response from login API: ' +
        e.toString());
      throw e;
    });
    if (loginRes.statusCode >= 400) {
      var error = new Error('Failure while logging in: ' + loginRes.statusMessage +
        ' (' + loginRes.statusCode + '). User: ' + username);
      error.statusCode = loginRes.statusCode;
      loginReqDefer.reject(error);
    }
    loginRes.setEncoding('utf8');
    loginRes.on('data', function(data) {
      buffer += data;
    });
    loginRes.on('end', function() {
      loginReqDefer.resolve(JSON.parse(buffer));
    });
  });

  loginReq.on('error', function(e) {
    loginReqDefer.reject(e);
  });
  loginReq.write(body);
  loginReq.end();

  return loginReqDefer.promise;
}

function parseReqBody(req) {
  var defer = Q.defer();
  var body = "";
  req.on('error', function(e) {
    defer.reject(e);
  });
  req.setEncoding('utf8');
  req.on('data', function(data) {
    body += data;
  });
  req.on('end', function() {
    defer.resolve(body);
  });

  return defer.promise;
}

function isValidEmail(email) {
  var regExp =
    /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
  return regExp.test(email);
}
