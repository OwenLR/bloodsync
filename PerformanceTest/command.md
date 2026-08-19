# Terminal — run each test, each writes its own JSON
artillery run pt01-login-low.yml -o pt01-results.json
artillery run pt02-login-average.yml -o pt02-results.json
artillery run pt03-login-peak.yml -o pt03-results.json
artillery run pt04-submit-low.yml -o pt04-results.json
artillery run pt05-submit-average.yml -o pt05-results.json
artillery run pt06-submit-peak.yml -o pt06-results.json
artillery run pt07-inventory-low.yml -o pt07-results.json
artillery run pt08-inventory-average.yml -o pt08-results.json
artillery run pt09-inventory-peak.yml -o pt09-results.json
artillery run pt10-search-low.yml -o pt10-results.json
artillery run pt11-search-average.yml -o pt11-results.json
artillery run pt12-search-peak.yml -o pt12-results.json
artillery run pt16-approve-low.yml -o pt16-results.json
artillery run pt17-approve-average.yml -o pt17-results.json
artillery run pt18-approve-peak.yml -o pt18-results.json
artillery run pt19-upload-low.yml -o pt19-results.json
artillery run pt20-upload-average.yml -o pt20-results.json
artillery run pt21-upload-peak.yml -o pt21-results.json

node pt13-15-socket-received.js low       # terminal 2 → pt13-results.json
node pt13-15-socket-received.js average   #             → pt14-results.json
node pt13-15-socket-received.js peak      #             → pt15-results.json

# Cleanup after testing
node cleanup-test-data.js            # see what it found
node cleanup-test-data.js --confirm  # actually delete + revert units

# Convert Result to HTML
node generate-report.js pt01-results.json
node generate-report.js pt02-results.json
node generate-report.js pt03-results.json
node generate-report.js pt04-results.json
node generate-report.js pt05-results.json
node generate-report.js pt06-results.json
node generate-report.js pt07-results.json
node generate-report.js pt08-results.json
node generate-report.js pt09-results.json
node generate-report.js pt10-results.json
node generate-report.js pt11-results.json
node generate-report.js pt12-results.json
node generate-report.js pt13-results.json
node generate-report.js pt14-results.json
node generate-report.js pt15-results.json
node generate-report.js pt16-results.json
node generate-report.js pt17-results.json
node generate-report.js pt18-results.json
node generate-report.js pt19-results.json
node generate-report.js pt20-results.json
node generate-report.js pt21-results.json

