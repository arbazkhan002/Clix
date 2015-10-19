from collections import defaultdict
def histogram(lines):	
	rvidDict = defaultdict(list)

	for line in lines:
	    rvidDict[line['REGION_VIEW_ID']].append(line)

	rvidmap = map(lambda x: [len(rvidDict[x]), x], rvidDict)

	xlabels = map(lambda x: x[1], rvidmap[:50])
	xaxis = range(len(xlabels))
	yaxis = map(lambda x: x[0], rvidmap[:50])
	return (xlabels, yaxis)