// *******************************************************
// CS 174a Graphics Example Code
// animation.js - The main file and program start point.  The class definition here describes how to display an Animation and how it will react to key and mouse input.  Right now it has 
// very little in it - you will fill it in with all your shape drawing calls and any extra key / mouse controls.  

// Now go down to display() to see where the sample shapes are drawn, and to see where to fill in your own code.

"use strict"
var canvas, canvas_size, gl = null, g_addrs,
	movement = vec2(),	thrust = vec3(), 	looking = false, prev_time = 0, animate = false, animation_time = 0;
		var gouraud = false, color_normals = false, solid = false;

		
// *******************************************************	
// When the web page's window loads it creates an Animation object, which registers itself as a displayable object to our other class GL_Context -- which OpenGL is told to call upon every time a
// draw / keyboard / mouse event happens.

window.onload = function init() {	var anim = new Animation();	}
function Animation()
{
	( function init (self) 
	{
		self.context = new GL_Context( "gl-canvas" );
		self.context.register_display_object( self );
		
		gl.clearColor( 0, 0, 0, 1 );			// Background color

		self.m_cube = new cube();
		self.m_obj = new shape_from_file( "teapot.obj" )
		self.m_axis = new axis();
		self.m_sphere = new sphere( mat4(), 4 );	
		self.m_fan = new triangle_fan_full( 10, mat4() );
		self.m_strip = new rectangular_strip( 1, mat4() );
		self.m_cylinder = new cylindrical_strip( 10, mat4() );
		self.m_dogHead = new dogHead(mat4());
		self.m_dogMouth = new dogMouth(mat4());
		self.m_dogBody = new dogBody(mat4());
		self.m_dogShoulder = new dogShoulder(mat4());
		self.m_dogForearm = new dogForearm(mat4());
		self.m_dogTail = new dogTail(mat4());
		self.m_dogPoo = new dogPoo(mat4());
		
		self.camera_transform = translate(0, 0,-40);
		self.projection_transform = perspective(45, canvas.width/canvas.height, .1, 400);		// The matrix that determines how depth is treated.  It projects 3D points onto a plane.

		gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);		gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);		gl.uniform1i( g_addrs.SOLID_loc, solid);
		
		self.animation_time = 0
		self.context.render();	
	} ) ( this );	
	
	canvas.addEventListener('mousemove', function(e)	{		e = e || window.event;		movement = vec2( e.clientX - canvas.width/2, e.clientY - canvas.height/2, 0);	});
}

// *******************************************************	
// init_keys():  Define any extra keyboard shortcuts here
Animation.prototype.init_keys = function()
{
	shortcut.add( "Space", function() { thrust[1] = -1; } );			shortcut.add( "Space", function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "z",     function() { thrust[1] =  1; } );			shortcut.add( "z",     function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "w",     function() { thrust[2] =  1; } );			shortcut.add( "w",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "a",     function() { thrust[0] =  1; } );			shortcut.add( "a",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "s",     function() { thrust[2] = -1; } );			shortcut.add( "s",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "d",     function() { thrust[0] = -1; } );			shortcut.add( "d",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "f",     function() { looking = !looking; } );
	shortcut.add( ",",     ( function(self) { return function() { self.camera_transform = mult( rotate( 3, 0, 0,  1 ), self.camera_transform ); }; } ) (this) ) ;
	shortcut.add( ".",     ( function(self) { return function() { self.camera_transform = mult( rotate( 3, 0, 0, -1 ), self.camera_transform ); }; } ) (this) ) ;

	shortcut.add( "r",     ( function(self) { return function() { self.camera_transform = mat4(); }; } ) (this) );
	shortcut.add( "ALT+s", function() { solid = !solid;					gl.uniform1i( g_addrs.SOLID_loc, solid);	
																		gl.uniform4fv( g_addrs.SOLID_COLOR_loc, vec4(Math.random(), Math.random(), Math.random(), 1) );	 } );
	shortcut.add( "ALT+g", function() { gouraud = !gouraud;				gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);	} );
	shortcut.add( "ALT+n", function() { color_normals = !color_normals;	gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);	} );
	shortcut.add( "ALT+a", function() { animate = !animate; } );
	
	shortcut.add( "p",     ( function(self) { return function() { self.m_axis.basis_selection++; console.log("Selected Basis: " + self.m_axis.basis_selection ); }; } ) (this) );
	shortcut.add( "m",     ( function(self) { return function() { self.m_axis.basis_selection--; console.log("Selected Basis: " + self.m_axis.basis_selection ); }; } ) (this) );	
}

function update_camera( self, animation_delta_time )
	{
		var leeway = 70, border = 50;
		var degrees_per_frame = .0005 * animation_delta_time;
		var meters_per_frame  = .03 * animation_delta_time;
																					// Determine camera rotation movement first
		var movement_plus  = [ movement[0] + leeway, movement[1] + leeway ];		// movement[] is mouse position relative to canvas center; leeway is a tolerance from the center.
		var movement_minus = [ movement[0] - leeway, movement[1] - leeway ];
		var outside_border = false;
		
		for( var i = 0; i < 2; i++ )
			if ( Math.abs( movement[i] ) > canvas_size[i]/2 - border )	outside_border = true;		// Stop steering if we're on the outer edge of the canvas.

		for( var i = 0; looking && outside_border == false && i < 2; i++ )			// Steer according to "movement" vector, but don't start increasing until outside a leeway window from the center.
		{
			var velocity = ( ( movement_minus[i] > 0 && movement_minus[i] ) || ( movement_plus[i] < 0 && movement_plus[i] ) ) * degrees_per_frame;	// Use movement's quantity unless the &&'s zero it out
			self.camera_transform = mult( rotate( velocity, i, 1-i, 0 ), self.camera_transform );			// On X step, rotate around Y axis, and vice versa.
		}
		self.camera_transform = mult( translate( scale_vec( meters_per_frame, thrust ) ), self.camera_transform );		// Now translation movement of camera, applied in local camera coordinate frame
	}

////////// DRAW FUNCTIONS //////////

Animation.prototype.drawDogHead = function (model)
{
	this.m_dogHead.draw(model,this.camera_transform,this.projection_transform); // left hemisphere of dog head
	model = mult(model,scale(-1,1,1));
	this.m_dogHead.draw(model,this.camera_transform,this.projection_transform); // right hemisphere of dog head
	return model;
} // draw head

Animation.prototype.drawDogMouth = function (model)
{
	this.m_dogMouth.draw(model,this.camera_transform,this.projection_transform); // left half of mouth
	model = mult(model,scale(-1,1,1));
	this.m_dogMouth.draw(model,this.camera_transform,this.projection_transform); // right half of mouth
	return model;
} // draw mouth

Animation.prototype.dogBark = function (model)
{
	var periodicBark = Math.abs(15*Math.sin(0.010*this.animation_time));
	model = mult(model,translate(0,0,-5));
	model = mult(model,rotate(periodicBark,1,0,0));
	model = mult(model,translate(0,0,5));
	return model;
} // bark animation

Animation.prototype.drawDogBody = function(model)
{
	this.m_dogBody.draw(model,this.camera_transform,this.projection_transform); // left half of body
	model = mult(model,scale(-1,1,1));
	this.m_dogBody.draw(model,this.camera_transform,this.projection_transform); // right half of body
	return model;
}

Animation.prototype.dogArmSwayBackward = function(model)
{
		var periodicShoulder = (13*Math.sin(0.005*this.animation_time));
		model = mult(model,rotate(periodicShoulder,1,0,0));
		return model;
}

Animation.prototype.dogArmSwayForward = function(model)
{
		var periodicShoulder = -((13*Math.sin(0.005*this.animation_time)));
		model = mult(model,rotate(periodicShoulder,1,0,0));
		return model;
}

Animation.prototype.dogTailSway = function(model)
{
		var periodicShoulder = 7*Math.sin(0.01*this.animation_time);
		model = mult(model,rotate(periodicShoulder,0,0,1));
		return model;
}

Animation.prototype.drawDogArm = function(model)
{
		this.m_dogShoulder.draw(model,this.camera_transform,this.projection_transform);
		model = mult(model,translate(0,-3,-1)); // right forearm/shin pivot position
		this.m_dogForearm.draw(model,this.camera_transform,this.projection_transform);
		return model;
}

Animation.prototype.drawDogTail = function(model)
{
	this.m_dogTail.draw(model,this.camera_transform,this.projection_transform);
		model = mult(model,scale(-1,1,1));
		this.m_dogTail.draw(model,this.camera_transform,this.projection_transform);
		return model;
}

Animation.prototype.drawDog = function(model,stack,bark,walk,tailWag)
{
		gl.uniform4fv( g_addrs.color_loc, vec4( 0.9,0.6,0.3,1) ); // set color

		///// HEAD /////
		stack.push(model); // save head starting point
		model = this.drawDogHead(model); // draw head
		
		///// MOUTH /////
		if (bark==1){
			model = this.dogBark(model); // must be set before dog mouth is drawn
		}
		model = this.drawDogMouth(model); // draw mouth
		
		///// BODY /////
		model = stack.pop(); // set coordinates to head starting point
		model = mult(model,translate(0,0,-8));
		stack.push(model); // save body staring point (where neck begins)
		stack.push(model);
			model = this.drawDogBody(model); // draw body

		///// ARMS AND LEGS /////
		model = stack.pop(); // start at neck	
		model = mult(model, translate(-2,-8,-4)); // front right corner of dog body
		stack.push(model); // save shoulder start position
		stack.push(model); 
		stack.push(model);
		if (walk==1){
			model = this.dogArmSwayForward(model);
			model = this.drawDogArm(model);
			model = stack.pop(); // go to right shoulder start position
			model = mult(model,translate(4,0,-11.5)); // move to hind left leg
			model = mult(model,scale(-1,1,1)); // reflect to make hind left leg
			model = this.dogArmSwayForward(model);
			model = this.drawDogArm(model);

			model = stack.pop(); // go to right shoulder start position
			model = mult(model,translate(0,0,-11.5)); // go to hind right leg start position
			model = this.dogArmSwayBackward(model); 
			model = this.drawDogArm(model);
			model = stack.pop(); // go to right shoulder start position
			model = mult(model,translate(4,0,0)); // go to left shoulder start position
			model = mult(model,scale(-1,1,1));
			model = this.dogArmSwayBackward(model); 
			model = this.drawDogArm(model);
		}
		else if (walk==0){
			model = this.drawDogArm(model);
			model = stack.pop(); // go to right shoulder start position
			model = mult(model,translate(4,0,-11.5)); // move to hind left leg
			model = mult(model,scale(-1,1,1)); // reflect to make hind left leg
			model = this.drawDogArm(model);

			model = stack.pop(); // go to right shoulder start position
			model = mult(model,translate(0,0,-11.5)); // go to hind right leg start position
			model = this.drawDogArm(model);
			model = stack.pop(); // go to right shoulder start position
			model = mult(model,translate(4,0,0)); // go to left shoulder start position
			model = mult(model,scale(-1,1,1));
			model = this.drawDogArm(model);
		}
		
		///// TAIL /////
		model = stack.pop(); // start at neck
		model = mult(model,translate(0,-2,-15));
		if (tailWag==1){
			model = this.dogTailSway(model);
		}
		model = this.drawDogTail(model);
}

Animation.prototype.drawGridFloor = function(model)
{
	model = mult(model,translate(0,-22,0));
	model = mult(model,scale(1000,1,1000));
	this.m_cube.draw(model,this.camera_transform,this.projection_transform, "gridtexture.png");
}

Animation.prototype.drawBGSphere = function(model)
{
	model = mult(model,rotate(Math.abs(300*Math.sin(0.000005*this.animation_time)),0,1,0));
	model = mult(model,translate(0,0,0));
	model = mult(model,scale(300,300,300));
	this.m_sphere.draw(model,this.camera_transform,this.projection_transform, "galaxy.jpg");
}

Animation.prototype.drawTitleScreen = function(titleSquare,imagename)
{
	titleSquare = mult(titleSquare,scale(25,25,0));
	this.m_cube.draw(titleSquare,this.camera_transform,this.projection_transform,imagename);
}

Animation.prototype.deleteModel = function(model)
{
	model = mult(model,scale(0,0,0));
	return model;
}

Animation.prototype.drawPeach = function(model)
{
	model = mult(model,translate(0,0,60));
	model = mult(model,rotate(this.animation_time/100,0,1,0));
	this.m_sphere.draw(model,this.camera_transform,this.projection_transform,"peachtexture.jpg");	
}
// *******************************************************	
// display(): called once per frame, whenever OpenGL decides it's time to redraw.

var fps;

Animation.prototype.display = function(time)
	{
		if(!time) time = 0;
		var animation_delta_time = time - prev_time;
		if(animate) this.animation_time += animation_delta_time;
		prev_time = time;

		fps = animation_delta_time;
		
		update_camera( this, animation_delta_time );
			
		var basis_id = 0;
		
		var model = mat4();
		var titleSquare = mat4();
		var stack = new Array();
		var scene = 0;

		stack.push(model); // save world coords

		for (var i=0; i<25; i++){
			stack.push(model);
		}
		
		/**********************************
		Start coding here!!!!
		**********************************/
		
		////////// TITLE SCREEN //////////
		
		if (this.animation_time < 10000){
			this.drawTitleScreen(titleSquare,"titlescreen.png");
			this.camera_transform = lookAt(vec3(0,0,(this.animation_time/50)),vec3(0,0,0),vec3(0,1,0));
		}
		
		////////// SCENE //////////
		
		if (this.animation_time > 10000 && this.animation_time < 18000){
			this.camera_transform = lookAt(vec3(-10,0,10), vec3(0,0,0), vec3(0,1,0));
			model = stack.pop();
			this.drawGridFloor(model);
			model = stack.pop();
			this.drawBGSphere(model);
			model = stack.pop();
			if (this.animation_time < 15000) // dog stands idle
			{
				this.drawDog(model,stack,0,0,1);
			}
			if (this.animation_time > 15000 && this.animation_time < 16000) // woof woof woof!
			{
				this.drawDog(model,stack,1,0,1); 
			}
			if (this.animation_time > 16000 && this.animation_time < 18000) // dog stands idle
			{
				this.drawDog(model,stack,0,0,1);
			}
		}
		if (this.animation_time > 18000 && this.animation_time < 22000) // dog speaks
		{
			this.camera_transform = lookAt(vec3(0,0,40), vec3(0,0,0), vec3(0,1,0));
			model = stack.pop();
			this.drawTitleScreen(titleSquare,"speech1.png");
		}
		if (this.animation_time > 22000 & this.animation_time < 29540) // dog walks from left to right
		{
			this.camera_transform = lookAt(vec3(-50,-2,-8+(Math.abs(50*Math.sin(0.00032*this.animation_time)))), vec3(0,-2,-8), vec3(0,1,0));
			model = stack.pop();
			model = mult(model,translate(0,0,-0.01*this.animation_time)); // make the floor move from under (looks like walking)
			this.drawGridFloor(model);
			model = stack.pop();
			this.drawBGSphere(model);
			model = stack.pop();
			this.drawDog(model,stack,0,1,0);

		}
		

		if (this.animation_time > 29540 && this.animation_time < 33500)
		{
			model = stack.pop();
			this.drawGridFloor(model);
			model = stack.pop();
			this.drawBGSphere(model);
			model = stack.pop();
			if (this.animation_time > 29540 && this.animation_time < 31000)
			{
				this.camera_transform = lookAt(vec3(-50,-2,-8), vec3(0,-2,-8), vec3(0,1,0));
				this.drawDog(model,stack,0,0,0);	
			}
			if (this.animation_time > 31000 && this.animation_time < 32050)
			{
				this.camera_transform = lookAt(vec3(-50,-2,-8), vec3(0,-2,-8), vec3(0,1,0));
				model = mult(model,translate(0,Math.abs(5*Math.sin(this.animation_time/100)),0)); // make dog jump
				this.drawDog(model,stack,0,0,0);
				model = mult(model,translate(0,10,-5));
				model = mult(model,scale(5,5,-5));
				model = mult(model,rotate(90,0,1,0));
				this.m_cube.draw(model,this.camera_transform,this.projection_transform,"qblock.png");	
			}
			if (this.animation_time > 32050 && this.animation_time < 33500)
			{
				this.camera_transform = lookAt(vec3(-50,-2,-8), vec3(0,-2,-8), vec3(0,1,0));
				model = stack.pop();
				this.drawDog(model,stack,0,0,1);
			}
		}

		if (this.animation_time > 33500 && this.animation_time < 35000)
		{
				this.camera_transform = lookAt(vec3(0,0,40), vec3(0,0,0), vec3(0,1,0));
				model = stack.pop();
				this.drawTitleScreen(titleSquare,"speech2.png");
		}

		if (this.animation_time > 35000 && this.animation_time < 51000)
		{
			model = stack.pop();
			this.drawGridFloor(model);
			model = stack.pop();
			this.drawBGSphere(model);
			model = stack.pop();
			if (this.animation_time > 35000 && this.animation_time < 40000) // walking toward peach (swaying camera)
			{
				this.camera_transform = lookAt(vec3(-50,-2,-8*(this.animation_time/5000)), vec3(0,-2,-8), vec3(0,1,0));
				this.drawDog(model,stack,0,0,1);
				model = stack.pop();
				this.drawPeach(model);
			}
			if (this.animation_time > 40000 && this.animation_time < 47000) // walking toward peach (camera behind peach)
			{
				this.camera_transform = lookAt(vec3(0,0,75), vec3(0,0,60), vec3(0,1,0));
				model = stack.pop();
				model = mult(model,translate(0,0,this.animation_time/800));
				this.drawDog(model,stack,0,1,1);
				model = stack.pop();
				this.drawPeach(model);
			}
			if (this.animation_time > 47000 && this.animation_time < 50000) // eat the peach
			{
				this.camera_transform = lookAt(vec3(-10,0,0),vec3(0,0,0),vec3(0,1,0));
				model = stack.pop();
				this.drawDog(model,stack,1,0,0);
				model = mult(model,translate(0,-2,-62));
				this.drawPeach(model);
				model = stack.pop();
			}
			if (this.animation_time > 50000 && this.animation_time < 51000) // done eating peach
			{
				this.camera_transform = lookAt(vec3(-10,0,0),vec3(0,0,0),vec3(0,1,0));
				model = stack.pop();
				this.drawDog(model,stack,0,0,0);
				model = stack.pop();
			}
		}

		if (this.animation_time > 51000 && this.animation_time < 53000) // delicious!
		{
				this.camera_transform = lookAt(vec3(0,0,40), vec3(0,0,0), vec3(0,1,0));
				model = stack.pop();
				this.drawTitleScreen(titleSquare,"speech3.png");
		}

		if (this.animation_time > 53000 && this.animation_time < 54000) // later that day
		{
				this.camera_transform = lookAt(vec3(0,0,40), vec3(0,0,0), vec3(0,1,0));
				model = stack.pop();
				this.drawTitleScreen(titleSquare,"later1.png");
		}
		if (this.animation_time > 54000 && this.animation_time < 55000) // later that day
		{
				this.camera_transform = lookAt(vec3(0,0,40), vec3(0,0,0), vec3(0,1,0));
				model = stack.pop();
				this.drawTitleScreen(titleSquare,"later2.png");
		}
		if (this.animation_time > 55000 && this.animation_time < 56000) // later that day
		{
				this.camera_transform = lookAt(vec3(0,0,40), vec3(0,0,0), vec3(0,1,0));
				model = stack.pop();
				this.drawTitleScreen(titleSquare,"later3.png");
		}
		if (this.animation_time > 56000 && this.animation_time < 57000) // later that day
		{
				this.camera_transform = lookAt(vec3(0,0,40), vec3(0,0,0), vec3(0,1,0));
				model = stack.pop();
				this.drawTitleScreen(titleSquare,"later4.png");
		}
		
		if (this.animation_time > 57000 && this.animation_time < 65000) // dog poops
		{
			model = stack.pop();
			this.drawGridFloor(model);
			model = stack.pop();
			this.drawBGSphere(model);
			model = stack.pop();
			this.camera_transform = lookAt(vec3(-10,3,-35), vec3(0,-4,-19), vec3(0,1,0));
			model = stack.pop();
			this.drawDog(model,stack,0,0,0);
			gl.uniform4fv( g_addrs.color_loc, vec4( 0.4,0.2,0,1) ); // set color of poop
			model = stack.pop();
			if (this.animation_time>57000 && this.animation_time < 65000) // poop comes out
			{
				model = mult(model,translate(0,-4,-19*this.animation_time/52000));
				this.m_dogPoo.draw(model,this.camera_transform,this.projection_transform);
			}
		}

		if (this.animation_time > 65000 && this.animation_time < 68000) // doge
		{
				this.camera_transform = lookAt(vec3(0,0,40), vec3(0,0,0), vec3(0,1,0));
				model = stack.pop();
				this.drawTitleScreen(titleSquare,"doge.jpeg");
		}

		if (this.animation_time > 68000 && this.animation_time < 71000) // end
		{
				this.camera_transform = lookAt(vec3(0,0,40), vec3(0,0,0), vec3(0,1,0));
				model = stack.pop();
				this.drawTitleScreen(titleSquare,"end.png");
		}

		
		//this.m_axis.draw( basis_id++, model, this.camera_transform, this.projection_transform );

	}	

var fps = this.animation_delta_time;

Animation.prototype.update_strings = function( debug_screen_object )		// Strings this particular class contributes to the UI
{
	/*debug_screen_object.string_map["time"] = "Time: " + this.animation_time/1000 + "s";
	debug_screen_object.string_map["basis"] = "Showing basis: " + this.m_axis.basis_selection;
	debug_screen_object.string_map["animate"] = "Animation " + (animate ? "on" : "off") ;
	debug_screen_object.string_map["thrust"] = "Thrust: " + thrust;*/

	 debug_screen_object.timeNode.nodeValue = this.animation_time.toFixed(2)/1000 + "s"; 
    debug_screen_object.animationNode.nodeValue = (animate ? "on" : "off");
    debug_screen_object.fpsNode.nodeValue = ((1/fps)*1000).toFixed(2);
    
}