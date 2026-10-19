export function getAllRequests(req, res) {
  res.status(200).send('You viewed the test route!')
}
export function getRequests(req, res) {
  res.status(200).send('You viewed a request!')
}

export function createRequest(req, res) {
  res.status(200).send('You created a request!')
}

export function updateRequest(req, res) {
  res.status(200).send('You updated a request!')
}

export function deleteRequest(req, res) {
  res.status(200).send('You deleted a request!')
}