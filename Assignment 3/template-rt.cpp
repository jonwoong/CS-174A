/*
Jonathan Woong
804205763
DIS 1B
Assignment 3
*/

#define _CRT_SECURE_NO_WARNINGS
#include "matm.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <math.h>

#define PI 3.141592653589793
#define MAX_DEPTH 3

float EPSILON = 0.00001f;

using namespace std;

string filename;
string outputname;

int g_width;
int g_height;
float g_left;
float g_right;
float g_top;
float g_bottom;
float g_near;

struct Ray
{
    vec4 origin;
    vec4 dir;
};

///// SPHERE DATA /////
vector<string> s_name;
vector<float> s_posx;
vector<float> s_posy;
vector<float> s_posz;
vector<float> s_sclx;
vector<float> s_scly;
vector<float> s_sclz;
vector<float> s_r;
vector<float> s_g;
vector<float> s_b;
vector<float> s_Ka;
vector<float> s_Kd;
vector<float> s_Ks;
vector<float> s_Kr;
vector<float> s_n;

class Sphere{
public:
	string name;
	vec4 center; // (posx,posy,posz,1)
	vec3 scale; // (sclx, scly, sclz,1)
	vec4 color; // (r,g,b,0)
	float Ka; // [0-1]
	float Kd; // [0-1]
	float Ks; // [0-1]
	float Kr; // [0-1]
	float n; 
	bool intersect(const Ray&, float&, float&, float&, bool&, string);
        Sphere (
            string nm,
            const vec4 &c,
            const vec3 &s,
            const vec4 &clr, 
            const float ka,
            const float kd,
            const float ks,
            const float kr,
            const float n):
        name(nm), center(c),scale(s),color(clr),Ka(ka),Kd(kd),Ks(ks),Kr(kr),n(n)
        {}
};

vector<Sphere> sphereVector; // instantiate sphere vector

void createSpheres() // populate sphere vector
{
	for (int i=0; i<s_name.size(); i++) {
        sphereVector.push_back(Sphere(s_name[i],
        								vec4(s_posx[i],s_posy[i],s_posz[i],1.0f),
        								vec3(s_sclx[i],s_scly[i],s_sclz[i]),
        								vec4(s_r[i],s_g[i],s_b[i],0.0f),
        								s_Ka[i],s_Kd[i],s_Ks[i],s_Kr[i],s_n[i]));
    } // fill sphere vector with spheres from txt file
}

///// LIGHT DATA /////
vector<string> l_name;
vector<float> l_posx;
vector<float> l_posy;
vector<float> l_posz;
vector<float> l_Ir;
vector<float> l_Ig;
vector<float> l_Ib;

struct Light{
	string name;
	vec4 center; // (posx,posy,posz,1)
	vec4 intensity; // (Ir,Ig,Ib,0)
        Light(
            string nm,
            const vec4 &c,
            const vec4 &i):
        name(nm),center(c),intensity(i)
        {}
};

vector<Light> lightVector; // instantiate light vector

void createLights() // populate light vector
{
	for (int i=0; i<l_name.size(); i++) {
        lightVector.push_back(Light(l_name[i],vec4(l_posx[i],l_posy[i],l_posz[i],1.0f),vec4(l_Ir[i],l_Ig[i],l_Ib[i],0.0f)));
    } // fill light vector with lights from txt file
}

///// BACKGROUND DATA /////
float bg_r;
float bg_g;
float bg_b;

//// AMBIENT DATA /////
float amb_Ir;
float amb_Ib;
float amb_Ig;

vector<vec4> g_colors;

// -------------------------------------------------------------------
// Input file parsing

vec4 toVec4(const string& s1, const string& s2, const string& s3)
{
    stringstream ss(s1 + " " + s2 + " " + s3);
    vec4 result;
    ss >> result.x >> result.y >> result.z;
    result.w = 1.0f;
    return result;
}

float toFloat(const string& s)
{
    stringstream ss(s);
    float f;
    ss >> f;
    return f;
}

///// PARSING /////
void parseLine(const vector<string>& vs)
{
    const int labelnum = 11;
    const string labels[] = {"NEAR", "LEFT", "RIGHT", "BOTTOM", "TOP", "RES", "SPHERE", "LIGHT", "BACK", "AMBIENT", "OUTPUT"};
    unsigned label_id = find(labels,labels+labelnum, vs[0])-labels;

    switch(label_id)
    {
    	case 0: g_near = toFloat(vs[1]); break; // NEAR
    	case 1: g_left = toFloat(vs[1]); break; // LEFT
    	case 2: g_right = toFloat(vs[1]); break; // RIGHT
    	case 3: g_bottom = toFloat(vs[1]); break; // BOTTOM
    	case 4: g_top = toFloat(vs[1]); break; // TOP
    	case 5: g_width = toFloat(vs[1]); // RES x
    			g_height = toFloat(vs[2]); // RES y
    			g_colors.resize(g_width * g_height); break;
    	case 6: s_name.push_back(vs[1]); 
    			s_posx.push_back(toFloat(vs[2]));
    			s_posy.push_back(toFloat(vs[3]));
    			s_posz.push_back(toFloat(vs[4]));
    			s_sclx.push_back(toFloat(vs[5]));
    			s_scly.push_back(toFloat(vs[6]));
    			s_sclz.push_back(toFloat(vs[7]));
    			s_r.push_back(toFloat(vs[8]));
    			s_g.push_back(toFloat(vs[9]));
    			s_b.push_back(toFloat(vs[10]));
    			s_Ka.push_back(toFloat(vs[11]));
    			s_Kd.push_back(toFloat(vs[12]));
    			s_Ks.push_back(toFloat(vs[13]));
    			s_Kr.push_back(toFloat(vs[14]));
    			s_n.push_back(toFloat(vs[15])); break;
    	case 7: l_name.push_back(vs[1]);
    			l_posx.push_back(toFloat(vs[2]));
    			l_posy.push_back(toFloat(vs[3]));
    			l_posz.push_back(toFloat(vs[4]));
    			l_Ir.push_back(toFloat(vs[5]));
    			l_Ig.push_back(toFloat(vs[6]));
    			l_Ib.push_back(toFloat(vs[7])); break;
    	case 8: bg_r = toFloat(vs[1]);
    			bg_g = toFloat(vs[2]);
    			bg_b = toFloat(vs[3]); break;
    	case 9: amb_Ir = toFloat(vs[1]);
    			amb_Ig = toFloat(vs[2]);
    			amb_Ib = toFloat(vs[3]);
    	case 10: outputname = (vs[1]);

    }
}

void loadFile(const char* filename)
{
    ifstream is(filename);
    if (is.fail())
    {
        cout << "Could not open file " << filename << endl;
        exit(1);
    }
    string s;
    vector<string> vs;
    while(!is.eof())
    {
        vs.clear();
        getline(is, s);
        istringstream iss(s);
        while (!iss.eof())
        {
            string sub;
            iss >> sub;
            vs.push_back(sub);
        }
        parseLine(vs);
    }
}


// -------------------------------------------------------------------
// Utilities

void setColor(int ix, int iy, const vec4& color)
{
    int iy2 = g_height - iy - 1; // Invert iy coordinate.
    g_colors[iy2 * g_width + ix] = color;
}

inline vec3 toVec3 (vec4 in) // converts vec4 to vec3
{
	return vec3(in[0],in[1],in[2]);
}

vec4 getReflectedRayDir(vec4 normal, vec4 raydir) // calculates R in phong model
{
	vec4 refRayDir;
	vec4 N = normalize(normal);
	vec4 L = normalize(raydir);
	refRayDir = L - 2.0f * dot(L,N) * N;
	return refRayDir;
}

vec4 addVec4s(vec4 v1, vec4 v2) // adds two vec4's together
{
	vec4 returnVec4;
	for (int i=0; i<4; i++)
	{
		returnVec4[i] = v1[i] + v2[i];
	}
	return returnVec4;
}

//////////////////// INTERSECTION ////////////////////

Ray inverseRay(Sphere& sphere, const Ray& ray)
{
	Ray invertedRay;
	mat4 scaleMatrix = Scale(sphere.scale);
	mat4 translateMatrix = Translate(sphere.center);
	mat4 M = matrixCompMult(translateMatrix,scaleMatrix);
	mat4 invertedM;
	bool successfulInvert = InvertMatrix(M,invertedM);
	if (!successfulInvert) { cout << "could not invert";}
	invertedRay.origin = invertedM*ray.origin;
	invertedRay.dir = invertedM*ray.dir;
	return invertedRay;
}

/* PARAMETERS:
	ray - self explanatory
	t1 - first result from quadratic equation 
	t2 - second result from quadratic equation
	t - the smaller and most valid of the two
	inside - used to flip the direction of normals
	mode - used as a flag to decide how to choose between t1 and t2

ALGORITHM:
	1. Calculate the discriminant of the quadratic equation 
	2. Use the discriminant to calculate t1 and t2
	3. Based on the mode, pick t1 or t2
		If we're testing a reflection or shadow-lighting ray, t1 or t2 can be as small as EPSILON, t=0 does not count as an intersection
		If we're testing an initial ray, t1 or t2 can be as small as 1 (g_near), t=1 counts as an intersection
*/
bool Sphere::intersect(const Ray& ray, float& t1, float& t2, float& t, bool& inside, string mode)
{
	///// NORMALIZE RAY /////
	const vec4 dist = ray.origin - this->center;
	vec4 dir;
	if (mode!="reflect")
	{
		dir = normalize(ray.dir);
	}
	else { 	dir = ray.dir; }

	////// VARIABLES /////
	float scale_x2 = this->scale[0]*this->scale[0]; float scale_y2 = this->scale[1]*this->scale[1]; float scale_z2 = this->scale[2]*this->scale[2];
	float dir_x2 = dir[0]*dir[0]; 					float dir_y2 = dir[1]*dir[1]; 					float dir_z2 = dir[2]*dir[2];
	float dist_x2 = dist[0]*dist[0]; 				float dist_y2 = dist[1]*dist[1]; 				float dist_z2 = dist[2]*dist[2];

	///// DISCRIMINANT /////
	float A = (dir_x2/scale_x2) + (dir_y2/scale_y2) + (dir_z2/scale_z2);
	float B = ((2.0f * dist[0] * dir[0])/(scale_x2)) + ((2.0f * dist[1] * dir[1])/(scale_y2)) + ((2.0f * dist[2] * dir[2])/(scale_z2));
	float C = (dist_x2/scale_x2) + (dist_y2/scale_y2) + (dist_z2/scale_z2) - 1.0f;
	float disc = (B*B)-(4.0f*A*C);

	///// DISCRIMINANT TESTING /////
	if (disc < 0.0f || A == 0.0f || B == 0.0f || C == 0.0f) {
		return false;
    }
    float sqrt_disc = sqrt(disc);
    t1 = (-B+sqrt_disc)/(2.0f*A); // calculate t1
    t2 = (-B-sqrt_disc)/(2.0f*A); // calculate t2
    vec4 p1 = ray.origin + dir*t1;
    vec4 p2 = ray.origin + dir*t2;
	   
	///// PICKING T /////
	
	if (mode == "reflect" || mode == "shadow") { // if our ray is a reflection or shadow-lighting ray
		inside = (t1<=EPSILON || t2<=EPSILON); // bool used to determine direction of normal
		if (t1<=EPSILON && t2<=EPSILON) { return false; } // if intersection happens before hit threshold, don't count them
		if (t1<=EPSILON) { t = t2; } // if t1 is close to 0, pick t2
	    else {
	    	if (t2<=EPSILON) { t = t1; }// if t2 is close to 0, pick t1
	    	else { t = (t1<t2) ? t1:t2; }// if both of them are close to 0, pick the smaller one
	    }
	    if (t<EPSILON) { return false; } // if t is smaller than the hit threshold, no intersection is made
		return true;
	}
	
	if (mode == "initialTrace") { // if our ray is an initial ray
		inside = (t1<g_near || t2<g_near); 
		if (t1<g_near && t2<g_near) { return false; } // if intersections happen before the near plane, don't count them
		if (t1<g_near) { t = t2; } // if t1 is between the camera and image plane, pick t2
	    else {
	    	if (t2<g_near) { t = t1; } // if t2 is between the camera and image plane, pick t1
	    	else { t = (t1<t2) ? t1:t2; } // if they're both between the camera and image plane, pick the smaller one
	    }
	    if (t<g_near) { return false; } // if t is between the camera and image plane, no intersection is made
	    return true;
	}
	return false;
}




//////////////////// RAY TRACING ////////////////////
/* 					
PARAMETERS:  
	ray - self explanatory
	depth - used in recursion, starts at 0, accumulates with each trace call
	traceMode - flags used to specify when/what to return
	doesIntersect - used to test whether a ray intersects anything

ALGORITHM:
	1. Check if the ray intersects anything
		if it doesn't, return a surface color (lighting) or 0 (reflection)
		if it does, return the surface color of the closest intersected sphere
	2. Calculate intersection point and normal vector at that point in world space
	3. If our ray in question is currently an initial ray (used in render()), get the surface color at every intersection point 
			and cast shadow-lighting rays from every intersection point to every light source
			and recursively reflect if Kr > 0
		if our ray is a reflection ray, keep reflecting until MAX_DEPTH is reached
		if our ray is a shadow-lighting ray, decide which points to light based on doesIntersect and light them
	4. Clamp (r,b,g) values if > 1
*/

vec4 trace(const Ray& ray, int depth, string traceMode, bool& doesIntersect)
{
	///// INITIALIZE DATA MEMBERS /////

		vec4 returnColor; // surface color (r,g,b,1) to be returned if a ray intersects a sphere
		vec4 backgroundColor = vec4(bg_r,bg_g,bg_b,1); // background color given
		vec3 ambience = vec3(amb_Ir,amb_Ib,amb_Ig); // ambience given
		Sphere* sphere = NULL; // used to test if ray intersects any sphere
		int currentDepth = depth;
		bool inside; // used to flip the normal if our ray origin is inside a sphere
		float t1=0.0f; // time1 of intersection
		float t2=0.0f; // time2 of intersection
		float t=0.0f; // either t1 or t2 (decided in the intersection function)

	///// CHECK FOR RAY COLLISION /////	

		for (int i=0; i<sphereVector.size(); i++) // for every sphere
		{
			if (sphereVector[i].intersect(ray,t1,t2,t,inside,traceMode)) // if our ray intersects a sphere
			{
				sphere = &sphereVector[i]; // placeholder sphere above is now the intersected sphere
				doesIntersect=true; // used to test reflection or shadow-lighting rays
				returnColor = sphere->color;
			}
		}

	///// SET RAY RETURN VALUES /////

		if (!sphere && traceMode=="reflect") { // if a reflection ray and we don't intersect anything, return (0,0,0,0)
			doesIntersect=false;
			returnColor = vec4(0.0f,0.0f,0.0f,1.0f);
			return returnColor;
		} 

		if (!sphere) { // if shadow-lighting ray doesn't intersect anything, return background color
			doesIntersect=false;
			 returnColor = backgroundColor;
			return returnColor;
		} 

	///// CALCULATE INTERSECTION + NORMAL /////
		
		// Intersection point
		vec4 dir;
		if (traceMode == "reflect") // ray is normalized when recursive reflect function is called
		{
			dir = ray.dir;
		}
		else 
		{
			dir = normalize(ray.dir);
		}
		vec4 intersectPoint = ray.origin + dir * t; // calculate point of intersection on sphere surface

		// Normal at intersection point
		vec4 normalDir = intersectPoint - sphere->center; // direction of normal
		float scale_x2 = sphere->scale[0]*sphere->scale[0]; // scaling factor x
		float scale_y2 = sphere->scale[1]*sphere->scale[1]; // scaling factor y
		float scale_z2 = sphere->scale[2]*sphere->scale[2]; // scaling factor z
		vec4 normalAtIntersect = vec4(2.0f* normalDir[0]/scale_x2, 2.0f*normalDir[1]/scale_y2, 2.0f*normalDir[2]/scale_z2, 0.0f); // calculate normal
		
		//normalAtIntersect *= (inside) ? -1 : 1;
		// ^ will change the lighting properties of a sphere depending on whether the light is inside of it or not
		// produces slightly different results than test cases if turned on, so I left it off

	///// SHADOWS/LIGHTING /////

	// AMBIENCE //
	returnColor = sphere->color * sphere->Ka * ambience; // set ambience color 

	if (traceMode=="shadow") // shadow rays do not go beyond collecting ambient points
	{
		return returnColor;
	}

	// LIGHTING/SHADOWS
	for (int k=0; k< lightVector.size(); k++) { // iterate through each light source
		int shadowDepth=0; // don't light points recursively
		bool bIntersect; // used to test if ray from intersection point to light source goes through any spheres

		// PHONG //
		vec4 L, N, V, R; // phong lighting variables
		L = normalize(lightVector[k].center-intersectPoint); // calculate L
		N = normalize(normalAtIntersect); // calculate N
		V = normalize(ray.dir); // calculate V
		R = (L - 2 * dot(L,N) * N); // calculate R
		float LdotN = max(0.0f,dot(L,N)); // calculate L.N
		float RdotV = max(0.0f,dot(R,V)); // calculate R.V

		Ray point2Light; // initialize shadow-lighting ray from intersection point to light source
		point2Light.origin = intersectPoint + L*EPSILON; // starting point is where the initial rays cast out intersect with a sphere
		point2Light.dir = lightVector[k].center - point2Light.origin; // direction equals to lower case L, will be normalized in the intersect function

		vec4 colorReturnedFromTrace = trace(point2Light,shadowDepth,"shadow",bIntersect); // test whether our intersect->light ray intersects anything
		if (!bIntersect && LdotN >0) // if the intersect point->light ray does not intersect anything 
		{	
			// DIFFUSE //
			returnColor += sphere->Kd * lightVector[k].intensity * LdotN * sphere->color; // calculate diffuse for intersect point
			// SPECULAR //
			returnColor += sphere->Ks * lightVector[k].intensity * (pow(RdotV,sphere->n)); // calculate specular for intersect point
		}
		else
		{
			continue;
		}
	}

	///// REFLECTION /////

	if (sphere->Kr > 0 && currentDepth < MAX_DEPTH+1){
		vec4 N = normalize(normalAtIntersect); 
		vec4 R = normalize(ray.dir);
		vec4 RdotN = dot(R,N);
		vec4 newDir = R - 2*RdotN*N; // calculate direction of reflected ray
		Ray reflectedRay; // initialize a reflection ray
		reflectedRay.dir = newDir;
		reflectedRay.origin = intersectPoint;
		returnColor += trace(reflectedRay,currentDepth++,"reflect",doesIntersect)*sphere->Kr; // sum the colors returned by a recursively spawned reflected rays
	}
	///// CLAMPING /////

	for (int i=0; i<4; i++) { // clamp color values to 1 if they exceed 1
		if (returnColor[i] > 1) { returnColor[i] = 1; }
	}

	return returnColor; // return an (r,b,g,1) value
}

vec4 getDir(int ix, int iy)
{
    // TODO: modify this. This should return the direction from the origin
    // to pixel (ix, iy), normalized.
    float fovx = PI/4;
    float fovy = (g_height/g_width)*fovx;
    float x = ((2*(float)ix-g_width)/g_width)*tan(fovx);
    float y = ((2*(float)iy-g_height)/g_height)*tan(fovy);
    vec4 dir = vec4(x,y,-1.0f,0.0f);
    dir = normalize(dir);
    return dir;
}

void renderPixel(int ix, int iy)
{
	int depth=0;
	bool doesIntersect = false;
	string mode = "initialTrace";
    Ray ray;
    ray.origin = vec4(0.0f, 0.0f, 0.0f, 1.0f);
    ray.dir = getDir(ix, iy);
    vec4 color = trace(ray,depth,mode,doesIntersect);
    setColor(ix, iy, color);
}

void render()
{
    for (int iy = 0; iy < g_height; iy++)
        for (int ix = 0; ix < g_width; ix++)
            renderPixel(ix, iy);
}


// -------------------------------------------------------------------
// PPM saving

void savePPM(int Width, int Height, char* fname, unsigned char* pixels) 
{
    FILE *fp;
    const int maxVal=255;

    printf("Saving image %s: %d x %d\n", fname, Width, Height);
    fp = fopen(fname,"wb");
    if (!fp) {
        printf("Unable to open file '%s'\n", fname);
        return;
    }
    fprintf(fp, "P6\n");
    fprintf(fp, "%d %d\n", Width, Height);
    fprintf(fp, "%d\n", maxVal);

    for(int j = 0; j < Height; j++) {
        fwrite(&pixels[j*Width*3], 3, Width, fp);
    }

    fclose(fp);
}

void saveFile()
{
    // Convert color components from floats to unsigned chars.
    unsigned char* buf = new unsigned char[g_width * g_height * 3];
    for (int y = 0; y < g_height; y++)
        for (int x = 0; x < g_width; x++)
            for (int i = 0; i < 3; i++)
            {
                buf[y*g_width*3+x*3+i] = (unsigned char)(((float*)g_colors[y*g_width+x])[i] * 255);
    		}
    char *oName = &outputname[0u];
    savePPM(g_width, g_height, oName, buf);
    delete[] buf;
}

// -------------------------------------------------------------------
// Main

int main(int argc, char* argvs[])
{
     if (argc < 2)
    {
        cout << "Usage: template-rt <input_file.txt>" << endl;
        exit(1);
    }
    loadFile(argvs[1]);

    ///// POPULATE VOLUME /////
   	createSpheres();
   	createLights();
    
    ///// RAY TRACE ///// 
    render();
    saveFile(); 

	return 0;
}

