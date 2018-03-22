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
		self.animation_time = 0

		self.m_cube = new cube();
		self.m_obj = new shape_from_file( "teapot.obj" )
		self.m_axis = new axis();
		self.m_sphere = new sphere( mat4(), 4 );	
		self.m_fan = new triangle_fan_full( 10, mat4() );
		self.m_strip = new rectangular_strip( 1, mat4() );
		self.m_cylinder = new cylindrical_strip( 10, mat4() );
		self.stack = new Array();
		self.periodic_tree = 2*Math.sin(0.005*animation_time);
		self.periodic_wing = 50*Math.sin(0.005*animation_time);
		self.periodic_thigh = 30*Math.sin(0.005*animation_time);
		self.periodic_shin = 15*Math.sin(0.005*animation_time);
		self.periodic_height = 2*Math.sin(0.005*animation_time);
		
		self.camera_transform = translate(0, 0,-40);
		self.projection_transform = perspective(45, canvas.width/canvas.height, .1, 100);		// The matrix that determines how depth is treated.  It projects 3D points onto a plane.
		
		gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);		gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);		gl.uniform1i( g_addrs.SOLID_loc, solid);
		
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

////////// SUBROUTINES //////////

Animation.prototype.drawTrunk = function (model_transform,stack,camera_transform,projection_transform,animation_time)
{
		model_transform = mult( model_transform, rotate(2*Math.sin(0.005*animation_time),0,0,1)); // periodic rotation (bottom of 1st square)
		gl.uniform4fv( g_addrs.color_loc, vec4( 0.5,0.25,0,0.5 ) ) // trunk color
		for (var i=0; i<8; i++) { // create entire trunk
			stack.push(model_transform); // push pivot point
			model_transform = mult( model_transform, translate(0,1/2,0)); // move from pivot point to center of square
			this.m_cube.draw(model_transform,camera_transform,projection_transform); // draw square
			model_transform = stack.pop(); // move to previos pivot point
			model_transform = mult( model_transform, translate(0,1,0)); // new pivot point
			model_transform = mult( model_transform, rotate(2*Math.sin(0.005*animation_time),0,0,1)); } // rotate about z
	return model_transform;
}

Animation.prototype.drawGround = function (model_transform,stack,camera_transform,projection_transform,animation_time)
{
		gl.uniform4fv( g_addrs.color_loc, vec4( 0.1,0.22,0,0.5 ) ) // ground color
		model_transform = mult( model_transform, scale( 50, 1, 50) ); // stretch cube into rectangular prism
		this.m_cube.draw(model_transform,camera_transform,projection_transform); // draw ground
		model_transform = mult( model_transform, scale(1/50,1,1/50)); // normalize axes
	return model_transform;
}

Animation.prototype.drawFoliage = function (model_transform,stack,camera_transform,projection_transform,animation_time)
{
		gl.uniform4fv( g_addrs.color_loc, vec4( 0.1,0.22,0,0.5 ) ) // foliage color
		model_transform = mult(model_transform, translate(0,3,0)); // center of foliage
		model_transform = mult(model_transform, scale(3,3,3)); // foliage radius = 3
		this.m_sphere.draw(model_transform,camera_transform,projection_transform); // draw foliage
		model_transform = mult(model_transform, scale(1/3,1/3,1/3)); // normalize axes
	return model_transform;
}

Animation.prototype.drawBody = function (model_transform,stack,camera_transform,projection_transform,animation_time)
{
		gl.uniform4fv( g_addrs.color_loc, vec4( 1,1,0,0.5 ) ) // body color
		model_transform = mult(model_transform,translate(0,8,-8)); // initial bee body position
		stack.push(model_transform); // push initial body position (save to make head)
		stack.push(model_transform); // save to make butt
		stack.push(model_transform); // save to make wings
		stack.push(model_transform); // save to make legs
		model_transform = mult(model_transform,scale(4,2,2)); // body (x,y,z) dimensions = (4,2,2)
		this.m_cube.draw(model_transform,camera_transform,projection_transform); // draw body
	return model_transform;
}

Animation.prototype.drawHead = function (model_transform,stack,camera_transform,projection_transform,animation_time)
{
		gl.uniform4fv( g_addrs.color_loc, vec4( 0.25,0.25,0.25,0.5 ) ) // head color
		model_transform = mult(model_transform,translate(3,0,0)); // center of bee head
		this.m_sphere.draw(model_transform,camera_transform,projection_transform); // draw head
	return model_transform;
}

Animation.prototype.drawButt = function (model_transform,stack,camera_transform,projection_transform,animation_time)
{
		gl.uniform4fv( g_addrs.color_loc, vec4( 0.25,0.25,0.25,0.5 ) ) // head color
		model_transform = mult(model_transform,translate(-4,0,0)); // center of butt
		model_transform = mult(model_transform,scale(2,1,1)); // butt dimensions (2,1,1)
		this.m_sphere.draw(model_transform,camera_transform,projection_transform); // draw butt
	return model_transform;
}

Animation.prototype.drawRightWing = function (model_transform,stack,camera_transform,projection_transform,animation_time)
{
		gl.uniform4fv( g_addrs.color_loc, vec4( 1,1,1,0.5 ) ) // wing color
		model_transform = mult(model_transform,rotate(50*Math.sin(0.005*animation_time),1,0,0)); // periodic wing flap
		model_transform = mult(model_transform,scale(2,1/2,4)); // wing dimensions (2,1/2,4)
		model_transform = mult(model_transform,translate(0,1/2,1/2)); // wing pivots on edge of body
		this.m_cube.draw(model_transform,camera_transform,projection_transform); // draw right wing
	return model_transform;
}

Animation.prototype.drawLeftWing = function (model_transform,stack,camera_transform,projection_transform,animation_time)
{
		model_transform = mult(model_transform,translate(0,0,-2)); // left wing pivot point
		model_transform = mult(model_transform,scale(1,1,-1)); // reflect axes over x axis (mirror)
		model_transform = mult(model_transform,rotate(50*Math.sin(0.005*animation_time),1,0,0)); // periodic wing flap
		model_transform = mult(model_transform,scale(2,1/2,4)); // wing dimensions (2,1/2,4)
		model_transform = mult(model_transform,translate(0,1/2,1/2)); // wing pivots on edge of body
		this.m_cube.draw(model_transform,camera_transform,projection_transform); // draw right wing
	return model_transform;
}

Animation.prototype.drawRightLegs = function (model_transform,stack,camera_transform,projection_transform,animation_time)
{
		gl.uniform4fv( g_addrs.color_loc, vec4( 0.25,0.25,0.25,0.5 ) ) // leg color
		for (var i=0; i<3; i++){
			stack.push(model_transform); // push back right corner
			model_transform = mult(model_transform,translate(i+1,0,0)); // thigh pivot point
			model_transform = mult(model_transform,rotate(100,1,0,0)); // rotate 120 degrees around x
			model_transform = mult(model_transform,rotate(10*Math.sin(0.005*animation_time),1,0,0)); // periodic leg movement
			model_transform = mult(model_transform,scale(1/2,1/2,2)); // lengthen thigh to 2, reduce width to 1/2
			model_transform = mult(model_transform,translate(0,1/2,1/2)); // move center of leg (edge meets with body edge)
			this.m_cube.draw(model_transform,camera_transform,projection_transform); // draw upper hind right leg
			model_transform = mult(model_transform,scale(2,2,1/2)); // normalize axesa
			model_transform = mult(model_transform,translate(0,0,1)); // knee pivot point
			model_transform = mult(model_transform,rotate(15,1,0,0)); // create leg curvature
			model_transform = mult(model_transform,rotate(15*Math.sin(0.005*animation_time),1,0,0)); // periodic leg movement
			model_transform = mult(model_transform,scale(1/2,1/2,2)); // lengthen shin to 2, reduce width to 1/2
			model_transform = mult(model_transform,translate(0,0,1/2)); // center of hind right shin
			this.m_cube.draw(model_transform,this.camera_transform,projection_transform); // draw shin
			model_transform = mult(model_transform,scale(2,2,1/2)); // normalize axes
			model_transform = stack.pop(); // start at back right corner again
		}
	return model_transform;
}

Animation.prototype.drawLeftLegs = function (model_transform,stack,camera_transform,projection_transform,animation_time)
{
		for (var i=0; i<3; i++){
			stack.push(model_transform); // push back left corner
			model_transform = mult(model_transform,translate(i+1,0,0)); // thigh pivot point
			model_transform = mult(model_transform,rotate(100,1,0,0)); // rotate 120 degrees around x
			model_transform = mult(model_transform,rotate(10*Math.sin(0.005*animation_time),1,0,0)); // periodic leg movement
			model_transform = mult(model_transform,scale(1/2,1/2,2)); // lengthen thigh to 2, reduce width to 1/2
			model_transform = mult(model_transform,translate(0,1/2,1/2)); // move center of leg (edge meets with body edge)
			this.m_cube.draw(model_transform,camera_transform,projection_transform); // draw upper hind right leg
			model_transform = mult(model_transform,scale(2,2,1/2)); // normalize axesa
			model_transform = mult(model_transform,translate(0,0,1)); // knee pivot point
			model_transform = mult(model_transform,rotate(15,1,0,0)); // create leg curvature
			model_transform = mult(model_transform,rotate(15*Math.sin(0.005*animation_time),1,0,0)); // periodic leg movement
			model_transform = mult(model_transform,scale(1/2,1/2,2)); // lengthen shin to 2, reduce width to 1/2
			model_transform = mult(model_transform,translate(0,0,1/2)); // center of hind right shin
			this.m_cube.draw(model_transform,camera_transform,projection_transform); // draw shin
			model_transform = mult(model_transform,scale(2,2,1/2)); // normalize axes
			model_transform = stack.pop(); // start at back right corner again
		}
	return model_transform;
}


// *******************************************************	
// display(): called once per frame, whenever OpenGL decides it's time to redraw.

Animation.prototype.display = function(time)
	{
		if(!time) time = 0;
		var animation_delta_time = time - prev_time;
		if(animate) this.animation_time += animation_delta_time;
		prev_time = time;
		
		update_camera( this, animation_delta_time );
			
		var basis_id = 0;
		
		var model_transform = mat4();
		
		/**********************************
		Start coding here!!!!
		**********************************/

		model_transform = mult( model_transform, scale(1,1,1)); // identity matrix

		////////// GROUND //////////
		this.stack.push(model_transform); // push identity matrix
			model_transform = this.drawGround(model_transform,this.stack,this.camera_transform,this.projection_transform,this.animation_time); // draw ground
			model_transform = mult( model_transform, translate(0,1/2,0)); // move origin from center of ground to surface
		this.stack.push(model_transform); // push position (surface of ground)

		////////// TRUNK //////////
		model_transform = this.drawTrunk(model_transform,this.stack,this.camera_transform,this.projection_transform,this.animation_time); // draw trunk
		
		////////// FOLIAGE //////////
		model_transform = this.drawFoliage(model_transform,this.stack,this.camera_transform,this.projection_transform,this.animation_time); // draw foliage

		////////// BEE BODY //////////
		model_transform = this.stack.pop();// start at center of ground surface
			model_transform = mult(model_transform,rotate(-this.animation_time/20,0,1,0)); // rotate bee around the y axis (clockwise)
			model_transform = mult(model_transform,translate(0,2*Math.sin(0.005*this.animation_time),0)); // height changes over time sinusoidally
			model_transform = this.drawBody(model_transform,this.stack,this.camera_transform,this.projection_transform,this.animation_time); // draw body
			// center of bee body is pushed onto the stack 3 times in the drawBody function

		////////// BEE HEAD //////////
		model_transform = this.stack.pop(); // start at initial body position
			model_transform = this.drawHead(model_transform,this.stack,this.camera_transform,this.projection_transform,this.animation_time); // draw head
		
		////////// BEE BUTT //////////
		model_transform = this.stack.pop(); // start at initial body position
			model_transform = this.drawButt(model_transform,this.stack,this.camera_transform,this.projection_transform,this.animation_time); // draw butt

		////////// BEE WINGS //////////
		model_transform = this.stack.pop(); // start at initial body position
			model_transform = mult(model_transform,translate(0,1,1)); // right wing pivot point
		this.stack.push(model_transform); // push right wing pivot point
			model_transform = this.drawRightWing(model_transform,this.stack,this.camera_transform,this.projection_transform,this.animation_time); // draw right wing
		model_transform = this.stack.pop(); // start at right wing pivot point
			model_transform = this.drawLeftWing(model_transform,this.stack,this.camera_transform,this.projection_transform,this.animation_time); // draw left wing


		////////// BEE LEGS //////////
		model_transform = this.stack.pop(); // start at center of body
			model_transform = mult(model_transform,translate(-2,-1,1)); // back right corner of bee body
			model_transform = this.drawRightLegs(model_transform,this.stack,this.camera_transform,this.projection_transform,this.animation_time); // draw right legs
			model_transform = mult(model_transform,translate(0,0,-2)); // move to back left corner of body
			model_transform = mult(model_transform,scale(1,1,-1)); // reflect over x axis (mirror)
			model_transform = this.drawLeftLegs(model_transform,this.stack,this.camera_transform,this.projection_transform,this.animation_time); // draw left legs
		
	// this.m_axis.draw( basis_id++, model_transform, this.camera_transform, this.projection_transform );

	}


Animation.prototype.update_strings = function( debug_screen_object )		// Strings this particular class contributes to the UI
{
	debug_screen_object.string_map["time"] = "Time: " + this.animation_time/1000 + "s";
	debug_screen_object.string_map["basis"] = "Showing basis: " + this.m_axis.basis_selection;
	debug_screen_object.string_map["animate"] = "Animation " + (animate ? "on" : "off") ;
	debug_screen_object.string_map["thrust"] = "Thrust: " + thrust;
}

