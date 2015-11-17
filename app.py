from flask import Flask, jsonify, request, render_template, url_for
import clickparser
import barcharts
import json
import csv
from collections import defaultdict, OrderedDict
import itertools
import json
app = Flask(__name__)

f=open("../st9_sept29.csv", "rb")
lines = []
with f as csvfile:
	linereader = csv.DictReader(csvfile, dialect='excel')
	for row in linereader:
		lines.append(row)

user_data = clickparser.parse(lines)
all_sessions_data = clickparser.all_sessions(user_data)
node = "COMPONENT_TYPE"
link_type = clickparser.countwt
all_links = clickparser.make_links(all_sessions_data["nodes"], node, link_type)

all_response_data = clickparser.jsonify_data(all_links[0], all_links[1])
clickparser.converge_rvid_nodes(all_response_data)

NAMES=["abc","abcd","abcde","abcdef"]

@app.route('/searchdsid',methods=['GET', 'POST'])
def searchdsid():
	def f(x):
		print x, user_data[x]
		return search in x and user_data[x][0]['ENVIRONMENT'] not in envfilter
		
	if request.method == 'POST':
		requestdata = request.get_json()
		search = requestdata[('term')]
		app.logger.debug(search)
		envfilter = requestdata['ENVIRONMENT'] if 'ENVIRONMENT' in requestdata else []
	else:
		search = request.args.get('term')
		app.logger.debug(search)
		
	# search holds the partially entered sessionID
	keys = filter(f, user_data)
	return jsonify(json_list=keys) 

@app.route('/datachart', methods=['GET', 'POST'])
def dataChart():
	if request.method == 'POST':
		requestdata = request.get_json()
		envfilter = requestdata['ENVIRONMENT']
		field = requestdata['field']
		prop_flag = field=='CLIENT_ID'
		data_value = barcharts.histogram(filter(lambda x: x['ENVIRONMENT'] not in envfilter, lines), field, prop_flag)
	else:		
		field = request.args.get('field')
		prop_flag = field=='CLIENT_ID'		
		data_value = barcharts.histogram(lines, field, prop_flag)
	

	
	total = sum(data_value[1])
	responseData = []
	for i,j in enumerate(data_value[1]):		
		data = {}
		data['letter'] = data_value[0][i]
		data['frequency'] = float(j)/total
		data['prop'] = None if not data_value[2] else data_value[2][i]
		responseData.append(data)
	
	response = {}   
	response["values"] = responseData   
	response = jsonify(response)
	response.status_code = 200
	return response 

@app.route('/datagraph', methods=['GET', 'POST'])
def dataGraph():
	if request.method == 'POST':
		requestdata = request.get_json()
		node = requestdata['node']
		link = requestdata['link']
		count = int(requestdata['num'])
		envfilter = requestdata['ENVIRONMENT'] if 'ENVIRONMENT' in requestdata else []
		session_id = requestdata['DSID'] if 'DSID' in requestdata else None
	else:   
		node = request.args.get('node')
		link = request.args.get('link')
		count = int(request.args.get('num'))
		envfilter = []
		session_id = None

	if not 0<=count<len(user_data):
		response = jsonify({})
		response.status_code = 404
		return response 

	link_type = clickparser.countwt
	
	# count is 0 when client requests for all sessions
	if count!=0 or session_id!=None:
		click_graph = clickparser.make_nodes(user_data[session_id]) if session_id!=None else clickparser.session_fetch(user_data, count, envfilter)
		l = clickparser.make_links(click_graph["nodes"], node, link_type)

		response_data = clickparser.jsonify_data(l[0], l[1])
		clickparser.converge_rvid_nodes(response_data)
		response = jsonify(response_data)
		response.status_code = 200
		return response
	else:
		all_response = jsonify(all_response_data)
		all_response.status_code = 200
		return all_response 

@app.route('/')
def hello():
	return render_template("index.html")

if __name__ == "__main__":
	app.run(host="0.0.0.0", debug=True)
