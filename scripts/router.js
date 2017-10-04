var Router = Backbone.Router.extend({
	routes: {
		"profile": 		"profile",
		"friend/:id": 	"friend",
		"chat/:id": 	"chat"
	}
});

var router = new Router();
router.on( "route:profile", function( options ) {
	console.log(options);
});

Backbone.history.start();