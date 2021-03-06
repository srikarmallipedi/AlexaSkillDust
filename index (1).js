/**
 * App ID for the skill
 */
var APP_ID = "amzn1.echo-sdk-ams.app.9afe70d2-b26d-4933-a25f-691857dd814f"; //replace with "amzn1.echo-sdk-ams.app.[your-unique-value-here]";

/**
 * The AlexaSkill prototype and helper functions
 */

var http = require('https');
var AlexaSkill = require('./AlexaSkill');

/*
 *
 * Particle is a child of AlexaSkill.
 *
 */
var Particle = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
Particle.prototype = Object.create(AlexaSkill.prototype);
Particle.prototype.constructor = Particle;

Particle.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("Particle onSessionStarted requestId: " + sessionStartedRequest.requestId + ", sessionId: " + session.sessionId);
};

Particle.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("Particle onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    var speechOutput = "Particle is Open";

    response.ask(speechOutput);
};

Particle.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("Particle onSessionEnded requestId: " + sessionEndedRequest.requestId + ", sessionId: " + session.sessionId);
};

Particle.prototype.intentHandlers = {
    // register custom intent handlers
    ParticleIntent: function (intent, session, response) {
		var sensorSlot = intent.slots.sensor;
		var lightSlot = intent.slots.light;
		var onoffSlot = intent.slots.onoff;

		var sensor = sensorSlot ? intent.slots.sensor.value : "";
		var light = lightSlot ? intent.slots.light.value : "";
		var onoff = onoffSlot ? intent.slots.onoff.value : "off";

		var speakText = "";

		console.log("Sensor = " + sensor);
		console.log("Light = " + light);
		console.log("OnOff = " + onoff);

		var op = "";
		var pin = "";
		var pinvalue = "";

		// Replace these with action device id and access token
		var deviceid = "330029001147353138383138";
		var accessToken = "241fee5140ad57a1f82bdc04ef10e8733dd3afa9";

		var sparkHst = "api.particle.io";

		console.log("Host = " + sparkHst);

		// Check slots and call appropriate Particle Functions
		if(sensor == "temperature"){
			speakText = "Temperature is 69°";

			op = "gettmp";
		}
		else if(sensor == "humidity"){
			speakText = "Humidity is 75%";

			op = "gethmd";
		}
		else if(light == "red"){
			pin = "D2";
		}
		else if(light == "green"){
			pin = "D6";
		}
    else if(sensor == "dust"){
      speakText = "Dust density is 1000 picograms per meter cubed";
      op = "getdensity";
    }
		// User is asking for temperature/pressure
		if(op.length > 0){
			var sparkPath = "/v1/devices/" + deviceid + "/" + op;

			console.log("Path = " + sparkPath);

			makeParticleRequest(sparkHst, sparkPath, "", accessToken, function(resp)
      {
				var json = JSON.parse(resp);

				console.log(sensor + ": " + json.return_value);
        if(json.return_value>3500)
        {
				response.tellWithCard(sensor + " density is " + json.return_value + "micrograms per meter cubed "+"    If you are sensitive to air quality it is advised that you leave the room",
        "Particle", "Particle!");
        }
        else
        {
          response.tellWithCard(sensor + " density is " + json.return_value + "micrograms per meter cubed "+"    This means that the dust density is low enough to be ignored", "Particle", "Particle!" );
        }



      });
		}
		// User is asking to turn on/off lights
		else if(pin.length > 0){
			if(onoff == "on"){
				pinvalue = "HIGH";
			}
			else{
				pinvalue = "LOW";
			}

			var sparkPath = "/v1/devices/" + deviceid + "/ctrlled";

			console.log("Path = " + sparkPath);

			var args = pin + "," + pinvalue;

			makeParticleRequest(sparkHst, sparkPath, args, accessToken, function(resp){
				var json = JSON.parse(resp);

				console.log("Temperature: " + json.return_value);

				response.tellWithCard("OK, " + light + " light turned " + onoff, "Particle", "Particle!");
				response.ask("Continue?");
			});
		}
		else{
			response.tell("Sorry, I could not understand what you said");
		}
    },
    HelpIntent: function (intent, session, response) {
        response.ask("I can tell you the density of the dust in the air");
    }
};

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the Particle skill.
    var particleSkill = new Particle();
    particleSkill.execute(event, context);
};

function makeParticleRequest(hname, urlPath, args, accessToken, callback){
	// Particle API parameters
	var options = {
		hostname: hname,
		port: 443,
		path: urlPath,
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Accept': '*.*'
		}
	}

	var postData = "access_token=" + accessToken + "&" + "args=" + args;

	console.log("Post Data: " + postData);

	// Call Particle API
	var req = http.request(options, function(res) {
		console.log('STATUS: ' + res.statusCode);
		console.log('HEADERS: ' + JSON.stringify(res.headers));

		var body = "";

		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			console.log('BODY: ' + chunk);

			body += chunk;
		});

		res.on('end', function () {
            callback(body);
        });
	});

	req.on('error', function(e) {
		console.log('problem with request: ' + e.message);
	});

	// write data to request body
	req.write(postData);
	req.end();
}
