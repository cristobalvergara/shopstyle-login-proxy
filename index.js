var http = require('http');
var https = require('https');
var argv = require('yargs')
  .argv;
var Q = require('q');
var request = Q.nbind(https.request, https);

var port = argv.port || argv.p || 6333;

var server = http.createServer();

server.listen(port, function(err) {
  if (err) {
    throw err;
  }

  console.log('Server running on port ' + port + '.');

  server.on('request', function(req, res) {
    try {
      var redirectHeader = req.headers['x-redirect'];
      var pid = req.headers['x-pid'] || 'shopstyle';

      var urlRegexp = /(.+):\/\/(.+):(.+)@(.+)$/;
      var urlRegexpResult = urlRegexp.exec(redirectHeader);
      if (!redirectHeader || !urlRegexpResult) {
        res.statusCode = 400;
        res.statusMessage =
          'The "x-redirect" header was missing or had wrong format in the request. Example: x-redirect: https://cvergara:popsugar@www.shopstyle.com.';
        res.end();
      }

      var protocol = urlRegexpResult[1];
      var username = urlRegexpResult[2];
      var password = urlRegexpResult[3];
      var host = urlRegexpResult[4];

      sessions = {};

      callLogin(protocol, host, username, password, pid)
        .then(function(session) {
          // console.log('session: ' + JSON.stringify(session));
          sessions[redirectHeader + '?pid=' + pid] = session;
        });

      callApi(protocol, host, req, res);

    } catch (err) {
      console.error(err.toString());
      res.statusCode = 500;
      res.statusMessage = 'Internal server error.';
      res.end();
    }
  });
});

function callApi(protocol, host, req, res) {
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

  var apiRequest = {
    protocol: protocol + ":",
    host: host,
    method: req.method,
    path: req.url,
    rejectUnauthorized: false,
    headers: apiHeaders
  };

  var apiReq = requester.request(apiRequest, function(apiRes) {
    apiRes.setEncoding('utf8');
    apiRes.pipe(res);
    apiRes.on('end', function() {
      defer.resolve();
    });
  });

  apiReq.on('error', function(e) {
    console.error('Failure while calling API: ' + e.toString());
    defer.reject(e);
  });

  var reqMethod = req.method.toLowerCase();
  if (reqMethod === 'post' || reqMethod === 'put') {
    req.pipe(apiReq);
  } else {
    apiReq.end();
  }

  return defer.promise;
}

function callLogin(protocol, host, username, password, pid) {
  var defer = Q.defer();

  var body = {
    password: password
  };

  if (isValidEmail(username)) {
    body.email = username;
  } else {
    body.handle = username;
  }

  body = JSON.stringify(body);

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
    loginRes.setEncoding('utf8');
    loginRes.on('data', function(data) {
      buffer += data;
    });
    loginRes.on('end', function() {
      defer.resolve(JSON.parse(buffer));
    });
  });

  loginReq.write(body);
  loginReq.on('error', function(e) {
    defer.reject(e);
  });
  loginReq.end();

  return defer.promise;
}

function isValidEmail(email) {
  var regExp =
    /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
  return regExp.test(email);
}
