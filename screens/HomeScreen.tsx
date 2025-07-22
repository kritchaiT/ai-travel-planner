import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import WeekendTrips from "../components/WeekendTrips";
import PopularDestinations from "../components/PopularDestinations";
import FeaturedGuides from "../components/FeaturedGuides";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { useUser } from "@clerk/clerk-expo";
import axios from "axios";

// Define HomeStackParamList (adjust path if needed)
export type HomeStackParamList = {
  HomeMain: undefined;
  NewTrip: undefined;
  PlanTrip: { trip: any }; // Replace 'any' with your Trip type
  AIChat: undefined;
  MapScreen: undefined;
};

// Define TabNavigatorParamList
export type TabNavigatorParamList = {
  Home: undefined;
  Guides: undefined;
  Profile: undefined;
};

// Combined navigation prop type
type HomeScreenNavigationProp = NativeStackNavigationProp<
  HomeStackParamList & TabNavigatorParamList
>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useUser();
  const [trips, setTrips] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    try {
      const clerkUserId = user?.id;
      const email = user?.primaryEmailAddress?.emailAddress; // Get user's email from Clerk
      if (!clerkUserId) {
        setError("User not authenticated");
        return;
      }

      const response = await axios.get("http://localhost:3000/api/trips", {
        params: { clerkUserId, email }, // Include email in query params
      });

      setTrips(response.data.trips);
      setError(null);
    } catch (error: any) {
      console.error("Error fetching trips:", error);
      setError(error.response?.data?.error || "Failed to fetch trips");
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [fetchTrips])
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center px-4 pt-4 pb-2">
          <Image
            source={{ uri: "https://wanderlog.com/assets/logoWithText.png" }}
            className="w-36 h-8"
            resizeMode="contain"
          />
          <View className="flex-row items-center space-x-3">
            <TouchableOpacity className="p-2 bg-gray-100 rounded-full">
              <Text className="text-lg">🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-yellow-400 px-3 py-1 rounded-full">
              <Text className="text-sm font-semibold text-white">PRO</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Divider */}
        <View className="border-b border-gray-200 mx-4" />

        {/* Banner */}
        <View className="relative">
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
            }}
            className="w-full h-80"
            resizeMode="cover"
          />
          <View className="absolute inset-0 flex items-center justify-center">
            <Text className="text-white text-4xl font-bold text-center px-6">
              Plan your next adventure
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("NewTrip")}
              className="bg-orange-500 px-6 py-2 rounded-full mt-4"
            >
              <Text className="text-white font-semibold text-base">
                Create new trip plan
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <Text className="text-red-500 text-sm px-4 mt-4">{error}</Text>
        )}

        {/* User's Trips */}
        {trips.length > 0 && (
          <View className="px-4 mt-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-xl font-semibold">Continue Planning</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Profile")}
              >
                <Text className="text-sm font-medium text-blue-500">
                  See all
                </Text>
              </TouchableOpacity>
            </View>

            {trips.slice(0, 1).map((trip) => (
              <TouchableOpacity
                key={trip._id}
                className="flex-row mb-4 items-center"
                onPress={() => navigation.navigate("PlanTrip", { trip })}
              >
                <Image
                  source={{ uri: trip.background }}
                  className="w-24 h-24 rounded-xl mr-4"
                />
                <View className="flex-1">
                  <Text className="text-lg font-semibold">
                    Trip to {trip.tripName}
                  </Text>
                  <View className="flex-row items-center mt-2">
                    <Image
                      source={{
                        uri: user?.imageUrl || "https://randomuser.me/api/portraits/men/32.jpg",
                      }}
                      className="w-6 h-6 rounded-full mr-2"
                    />
                    <Text className="text-sm text-gray-500">
                      {trip.placesToVisit.length} place{trip.placesToVisit.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Featured Guides */}
        <View className="p-4">
          <Text className="text-2xl font-semibold mb-4">
            Featured guides from users
          </Text>
          <FeaturedGuides />
        </View>

        {/* Weekend Trips */}
        <View className="p-4">
          <Text className="text-2xl font-semibold mb-4">Weekend trips</Text>
          <WeekendTrips />
        </View>

        {/* Popular Destinations */}
        <View className="p-4">
          <Text className="text-2xl font-semibold mb-4">
            Popular destinations
          </Text>
          <PopularDestinations />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;