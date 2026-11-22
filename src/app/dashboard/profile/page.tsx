import ProfileContainer from "@/components/profile/ProfileContainer";
import React from "react";
import { CareerProfileCard } from "@/components/profile/CareerProfileCard";

function Profile() {
  return (
    <div className="col-span-3 space-y-4">
      <CareerProfileCard />
      <ProfileContainer />
    </div>
  );
}

export default Profile;
