import csv
from collections import defaultdict, OrderedDict
import itertools
import json
class clicknode:
	node_count = itertools.count()
	group_count = itertools.count()
	group_map = {}
	def __init__(self, **nodedict):
		group = nodedict['REGION_VIEW_ID']
		
		if group not in clicknode.group_map:
			clicknode.group_map[group] = next(clicknode.group_count)

		# use dictionary to populate object's fields	
		self.__dict__.update(nodedict)
		
		self.id = next(clicknode.node_count)

		# that each node is a single entity (used in merging group of nodes)
		self.count = 1
	 
	def to_JSON(self):
		return json.dumps(self, default=lambda o: o.__dict__, 
			sort_keys=True, indent=4)
			 
	def __str__(self):
		return str(self.id)+" "+self.REGION_VIEW_ID+" "+self.CLIENT_ID
		

class clicklink:
	def __init__(self, nodea, nodeb, edge):
		self.source = nodea
		self.dest = nodeb
		self.linkwt = edge
	
	def __str__(self):
		return ";".join(map(lambda x: str(x), [self.source, self.dest, self.linkwt]))

class linkwt:
	name = None
	def __init__(self, src, dest):
		self.count = 1
		self.val = getattr(dest, self.name) 
		self.length = 80

class countwt(linkwt):
	name = "count"

	def merge(self, linkwt):
		self.val+=linkwt.val
		self.count+=linkwt.count

class responsetimewt(linkwt):
	name = "RESPONSE_TIME"

	def merge(self, linkwt):
		self.val = (self.count*self.val + linkwt.val*linkwt.count)/(self.count+linkwt.count)
		self.count += linkwt.count

# make nodes from a click logs of one user
def make_nodes(click_session):
	click_session.sort(key=lambda x:[x[('DATE')], x[('STARTTIME')]])
	last = None
	nodes = []
	links = []
	link_map = {}

	for i in click_session:
		if i['REGION_VIEW_ID'] == '/AtkNotificationFlowTF/AtkNotificationPage':
			continue
		node = clicknode(**i)
		nodes.append(node)

	return {"nodes":nodes}

# make links from the sequence of clicks based on the node field and link type given. such as response time links between all component types or count(frequency) links between all client ids
# returns list of nodes (id, group), list of edges (src, dest, linkwt)
def make_links(nodes, field, link_type):
	#Ordered so that index of a key is constant with updates to the dict
	node_map = OrderedDict()
	if len(nodes) <= 1: return None
	last = nodes[0] 
	link_map = {}
	# get the field of an object dynamically
	node_map[(getattr(last,field), last.REGION_VIEW_ID)] = nodes[0]
	links = []
	for node in nodes[1:]:
		# None nodes are breaks representing change of sessions
		if node is None:
			continue
			
		if node not in node_map:
			# node not in node_map
			node_map[(getattr(node,field), node.REGION_VIEW_ID)] = node

		dest = node_map.keys().index((getattr(node,field), node.REGION_VIEW_ID))
		src = node_map.keys().index((getattr(last,field), last.REGION_VIEW_ID))		   

		edge = link_type(last, node)
		if (src,dest) not in link_map:
			link = clicklink(src, dest, edge)
			link_map[(src, dest)] = link
		else:
			link = link_map[(src, dest)]
			(link.linkwt).merge(edge)
			
		last = node

	return (node_map,link_map) 


# to put all elements of the same RVID together, create extra links of 0 weight between all nodes of the same RVID
def converge_rvid_nodes(response):
	nodes = response["nodes"]

	# better algorithm: get_pairs(nodes) --> sorts the nodes based on group field so that each group ends at a known index 
	# and then for each group, return all pairs of indices
	for i in range(len(nodes)):
		for j in range(i+1, len(nodes)):
			if nodes[i]["group"] == nodes[j]["group"]:
				data = {}
				data["source"] = i
				data["target"] = j
				data["value"] = 0
				data["len"] = 40
				response["links"].append(data)


# input from make_links()
# outputs json string format to be send as response
def jsonify_data(node_data, link_data):
	response = {"nodes":[], "links":[]}
	for field, group in node_data:
		data = {}
		data["name"] = field
		data["group"] = group
		data["prop"] = node_data[(field, group)].__dict__
		response["nodes"].append(data)

	for link in link_data:
		l = link_data[link]
		data = {}
		data["source"] = l.source
		data["target"] = l.dest
		data["value"] = 1
		data["len"] = l.linkwt.length
		response["links"].append(data)

	return response	 

def parse(lines):
	users = defaultdict(list)
	rvidDict = defaultdict(list)
	ctypeDict = defaultdict(list)
	for line in lines:
		users[line['DSID']].append(line)
		rvidDict[line['REGION_VIEW_ID']].append(line)
		ctypeDict[line['COMPONENT_TYPE']].append(line)

	return users


# pick the session numbered "num" from click history data
def session_fetch(user_data, num, envfilters=[]):
	users = filter(lambda x: user_data[x][0]['ENVIRONMENT'] not in envfilters, user_data)
	num = num%len(users)
	session = user_data[users[num]]
	return make_nodes(session)
	
def longest_session(users): 
	b = map(lambda x: [len(users[x]), x], users)
	click_one = max(b)[1]
	#users[click_one]


	click_session = users[click_one]

	return make_nodes(click_session)

def all_sessions(users):
	nodes = []
	for i in users:
		s = users[i]
		nodes.extend(make_nodes(s)["nodes"])
		nodes.append(None)

	return {"nodes":nodes}
