from collections import defaultdict

# get major fields from an obj
def brief_obj(obj):
	major_fields = ['REGION_VIEW_ID', 'COMPONENT_TYPE', 'DISPLAY_NAME']
	sum_obj = {}
	for i in major_fields:
		sum_obj[i] = obj[0][i]
	return sum_obj	
	
def histogram(lines, field, prop=False):	
	field_dict = defaultdict(list)

	for line in lines:
	    field_dict[line[field]].append(line)

	field_map = map(lambda x: [len(field_dict[x]), x], field_dict)

	xlabels = map(lambda x: x[1], field_map[:50])
	xaxis = range(len(xlabels))
	yaxis = map(lambda x: x[0], field_map[:50])
	extras = None
	if prop:
		extras = map(lambda x: brief_obj(field_dict[x[1]]), field_map[:50])
	return (xlabels, yaxis, extras)
