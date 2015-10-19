from flask import Flask, jsonify, request, render_template, url_for
import clickparser
import barcharts
import json
import csv
from collections import defaultdict, OrderedDict
import itertools
import json
app = Flask(__name__)

f=open("C:\Users\\arbkhan.ORADEV\Projects\ClickFlowAnalytics\st9_sept29.csv", "rb")
lines = []
with f as csvfile:
    linereader = csv.DictReader(csvfile, dialect='excel')
    for row in linereader:
        lines.append(row)

@app.route('/datachart')
def dataChart():
	data_value = barcharts.histogram(lines)
	responseData = []
	for i,j in enumerate(data_value[1]):		
		data = {}
		data['letter'] = i
		data['frequency'] = j
		responseData.append(data)

	response = {}	
	response["values"] = responseData	
	response = jsonify(response)
	response.status_code = 200
	return response	

@app.route('/datagraph')
def dataGraph():
	node = request.args.get('node')
	link = request.args.get('link')

	click_graph = clickparser.parse(lines)

	jsondata = json.dumps(click_graph, default=lambda o: o.__dict__, 
            sort_keys=True, indent=4)
	#print jsondata[:1000]

	link_type = clickparser.countwt
	l = clickparser.make_links(click_graph["nodes"], "COMPONENT_TYPE", link_type)
	#print len(l[1]), len(click_graph["nodes"])
	response_data = clickparser.jsonify_data(l[0], l[1])
	clickparser.converge_rvid_nodes(response_data)

	response = jsonify(response_data)
	response.status_code = 200
	return response

@app.route('/')
def hello():
	return render_template("index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)