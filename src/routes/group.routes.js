const express = require("express");
const prisma = require("../config/prisma");
const { protect } = require("../middleware/auth.middleware");
const router = express.Router();
router.use(protect);

const userSelect = { id: true, username: true, fullName: true, avatar: true };
async function membership(groupId, userId) { return prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } }); }

router.get("/", async (req, res, next) => { try {
  const groups = await prisma.group.findMany({ where: { members: { some: { userId: req.user.id } } }, include: { members: { include: { user: { select: userSelect } } }, messages: { take: 1, orderBy: { createdAt: "desc" }, include: { sender: { select: userSelect } } } }, orderBy: { updatedAt: "desc" } });
  res.json({ success: true, data: { groups } });
} catch(e){ next(e); } });

router.post("/", async (req,res,next)=>{ try {
  const name=String(req.body.name||"").trim(); const memberIds=[...new Set((req.body.memberIds||[]).map(String).filter(Boolean))].filter(id=>id!==req.user.id);
  if(name.length<2||name.length>80) return res.status(400).json({success:false,message:"Group name 2 se 80 characters honi chahiye."});
  if(!memberIds.length) return res.status(400).json({success:false,message:"Kam az kam aik member select karein."});
  const group=await prisma.group.create({data:{name,creatorId:req.user.id,members:{create:[{userId:req.user.id,isAdmin:true},...memberIds.map(userId=>({userId}))]}},include:{members:{include:{user:{select:userSelect}}}}});
  res.status(201).json({success:true,message:"Group create ho gaya.",data:{group}});
}catch(e){next(e);} });

router.get("/:groupId/messages", async(req,res,next)=>{try{
  if(!await membership(req.params.groupId,req.user.id)) return res.status(403).json({success:false,message:"Aap is group ke member nahi hain."});
  const messages=await prisma.groupMessage.findMany({where:{groupId:req.params.groupId},include:{sender:{select:userSelect}},orderBy:{createdAt:"asc"},take:200});
  res.json({success:true,data:{messages}});
}catch(e){next(e);} });

router.post("/:groupId/messages", async(req,res,next)=>{try{
  if(!await membership(req.params.groupId,req.user.id)) return res.status(403).json({success:false,message:"Aap is group ke member nahi hain."});
  const text=String(req.body.text||"").trim(); if(!text&& !req.body.file) return res.status(400).json({success:false,message:"Message required hai."});
  const message=await prisma.groupMessage.create({data:{groupId:req.params.groupId,senderId:req.user.id,text:text||null,file:req.body.file||null,fileType:req.body.fileType||null},include:{sender:{select:userSelect}}});
  const members=await prisma.groupMember.findMany({where:{groupId:req.params.groupId},select:{userId:true}}); const io=req.app.get("io"); members.forEach(({userId})=>io?.to(`user:${userId}`).emit("group-message",message));
  res.status(201).json({success:true,data:{message}});
}catch(e){next(e);} });

router.patch("/:groupId", async(req,res,next)=>{try{
  const member=await membership(req.params.groupId,req.user.id);
  if(!member?.isAdmin) return res.status(403).json({success:false,message:"Sirf group admin edit kar sakta hai."});
  const data={};
  if(req.body.name!==undefined){const name=String(req.body.name||"").trim();if(name.length<2||name.length>80)return res.status(400).json({success:false,message:"Group name 2 se 80 characters honi chahiye."});data.name=name;}
  if(req.body.avatar!==undefined)data.avatar=req.body.avatar?String(req.body.avatar):null;
  const group=await prisma.group.update({where:{id:req.params.groupId},data,include:{members:{include:{user:{select:userSelect}}},messages:{take:1,orderBy:{createdAt:"desc"},include:{sender:{select:userSelect}}}}});
  res.json({success:true,message:"Group update ho gaya.",data:{group}});
}catch(e){next(e);} });

router.delete("/:groupId", async(req,res,next)=>{try{
  const member=await membership(req.params.groupId,req.user.id);
  if(!member?.isAdmin)return res.status(403).json({success:false,message:"Sirf group admin delete kar sakta hai."});
  await prisma.group.delete({where:{id:req.params.groupId}});res.json({success:true,message:"Group delete ho gaya."});
}catch(e){next(e);} });
module.exports=router;
