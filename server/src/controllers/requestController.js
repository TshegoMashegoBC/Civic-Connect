function createRequestController({ requestService }) {
  return {
    async create(req, res) {
      const request = await requestService.create(req.user, req.body);
      res.status(201).json({ request });
    },
    async list(req, res) {
      res.status(200).json(await requestService.list(req.user, req.query));
    },
    async getById(req, res) {
      res.status(200).json({ request: await requestService.getById(req.user, req.params.id) });
    },
    async assign(req, res) {
      res.status(200).json({ request: await requestService.assign(req.user, req.params.id, req.body) });
    },
    async transition(req, res) {
      res.status(200).json({ request: await requestService.transition(req.user, req.params.id, req.body) });
    },
    async addComment(req, res) {
      res.status(201).json({ request: await requestService.addComment(req.user, req.params.id, req.body) });
    },
    async setDueAt(req, res) {
      res.status(200).json({ request: await requestService.setDueAt(req.user, req.params.id, req.body) });
    },
    async summary(req, res) {
      res.status(200).json({ summary: await requestService.summary(req.user) });
    },
  };
}

module.exports = createRequestController;
