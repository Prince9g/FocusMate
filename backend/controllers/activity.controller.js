export const SingleRoom = async (req, res) => {
  const { roomId } = req.params;
  try {
    const activities = await RoomActivity.find({ roomId });

    const totalUsers = activities.length;

    const sessions = activities.map((session) => {
      const joined = session.joinedAt;
      const left = session.leftAt || new Date();
      const timeSpentMs = new Date(left) - new Date(joined);
      return {
        socketId: session.socketId,
        joinedAt: session.joinedAt,
        leftAt: session.leftAt,
        timeSpentMinutes: Math.floor(timeSpentMs / 1000 / 60),
      };
    });

    const totalMinutesSpent = sessions.reduce(
      (acc, cur) => acc + cur.timeSpentMinutes,
      0
    );

    res.json({
      roomId,
      totalUsers,
      totalMinutesSpent,
      sessions,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};

// Get analytics for all rooms
export const Rooms = async (req, res) => {
    try {
      const activities = await RoomActivity.find({});
  
      const roomMap = {};
  
      // Group activities by roomId
      activities.forEach((session) => {
        const roomId = session.roomId;
        const joined = session.joinedAt;
        const left = session.leftAt || new Date();
        const timeSpentMs = new Date(left) - new Date(joined);
        const timeSpentMinutes = Math.floor(timeSpentMs / 1000 / 60);
  
        if (!roomMap[roomId]) {
          roomMap[roomId] = {
            roomId,
            totalUsers: 0,
            totalMinutesSpent: 0,
          };
        }
  
        roomMap[roomId].totalUsers += 1;
        roomMap[roomId].totalMinutesSpent += timeSpentMinutes;
      });
  
      const allRoomsAnalytics = Object.values(roomMap);
  
      res.json(allRoomsAnalytics);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch room analytics" });
    }
  };