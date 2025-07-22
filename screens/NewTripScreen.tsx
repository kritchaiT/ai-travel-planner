import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Calendar, DateObject } from "react-native-calendars";
import dayjs from "dayjs";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { useNavigation } from "@react-navigation/native";
import { useTrip } from "../context/TripContext";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useAuth, useUser } from "@clerk/clerk-expo";
import axios from "axios";

const GOOGLE_API_KEY = "AIzaSyDfr7eubWiWHSMt_3DGir2Fcx4BN1NtoTg";

const NewTripScreen = () => {
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{
    startDate?: string;
    endDate?: string;
  }>({});
  const [displayStart, setDisplayStart] = useState<string>("");
  const [displayEnd, setDisplayEnd] = useState<string>("");
  const [searchVisible, setSearchVisible] = useState(false);
  const [chosenLocation, setChosenLocation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // New loading state
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { addTrip } = useTrip();
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();
  const { user } = useUser();

  const today = dayjs().format("YYYY-MM-DD");

  const handleDayPress = (day: DateObject) => {
    const selected = day.dateString;

    if (
      !selectedRange.startDate ||
      (selectedRange.startDate && selectedRange.endDate)
    ) {
      setSelectedRange({ startDate: selected });
    } else if (
      selectedRange.startDate &&
      dayjs(selected).isAfter(selectedRange.startDate)
    ) {
      setSelectedRange({
        ...selectedRange,
        endDate: selected,
      });
    }
  };

  const getMarkedDates = () => {
    const marks: any = {};

    const { startDate, endDate } = selectedRange;
    if (startDate && !endDate) {
      marks[startDate] = {
        startingDay: true,
        endingDay: true,
        color: "#FF5722",
        textColor: "white",
      };
    } else if (startDate && endDate) {
      let curr = dayjs(startDate);
      const end = dayjs(endDate);

      while (curr.isBefore(end) || curr.isSame(end)) {
        const formatted = curr.format("YYYY-MM-DD");
        marks[formatted] = {
          color: "#FF5722",
          textColor: "white",
          ...(formatted === startDate && { startingDay: true }),
          ...(formatted === endDate && { endingDay: true }),
        };
        curr = curr.add(1, "day");
      }
    }

    return marks;
  };

  const onSaveDates = () => {
    if (selectedRange.startDate) setDisplayStart(selectedRange.startDate);
    if (selectedRange.endDate) setDisplayEnd(selectedRange.endDate);
    setCalendarVisible(false);
  };

  const handleCreateTrip = async () => {
    try {
      setIsLoading(true); // Show loading
      setError(null);

      // Validate required fields
      if (!chosenLocation || !selectedRange.startDate || !selectedRange.endDate) {
        setError("Please select a location and date range");
        return;
      }

      // Get Clerk user data
      const clerkUserId = user?.id;
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!clerkUserId || !email) {
        setError("User not authenticated or email missing");
        return;
      }

      // Fetch place photo for background
      let background = "https://via.placeholder.com/150"; // Fallback image
      try {
        const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
          chosenLocation
        )}&inputtype=textquery&fields=place_id,photos&key=${GOOGLE_API_KEY}`;
        const findPlaceRes = await axios.get(findPlaceUrl);
        const placeId = findPlaceRes.data.candidates?.[0]?.place_id;

        if (placeId) {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${GOOGLE_API_KEY}`;
          const detailsRes = await axios.get(detailsUrl);
          const photos = detailsRes.data.result?.photos;
          if (photos?.length > 0) {
            background = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photos[0].photo_reference}&key=${GOOGLE_API_KEY}`;
          }
        }
      } catch (photoError) {
        console.warn("Error fetching place photo:", photoError);
      }

      // Prepare trip data
      const tripData = {
        tripName: chosenLocation,
        startDate: selectedRange.startDate,
        endDate: selectedRange.endDate,
        startDay: dayjs(selectedRange.startDate).format("dddd"),
        endDay: dayjs(selectedRange.endDate).format("dddd"),
        background, // Use dynamic background
        clerkUserId,
        userData: {
          email,
          name: user?.fullName || "",
        },
      };

      // Get token for authentication
      const token = await getToken();

      // Send request to backend
      const response = await axios.post("http://localhost:3000/api/trips", tripData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const createdTrip = response.data.trip;

      // Add trip to context
      addTrip(createdTrip);

      // Navigate to PlanTrip with the created trip
      navigation.navigate("PlanTrip", { trip: createdTrip });
    } catch (error: any) {
      console.error("Error creating trip:", error);
      setError(error.response?.data?.error || "Failed to create trip");
    } finally {
      setIsLoading(false); // Hide loading
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-5">
      {/* Close Button */}
      <View className="mt-2 mb-4">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Title and Subtitle */}
      <Text className="text-2xl font-bold text-gray-900 mb-1">
        Plan a new trip
      </Text>
      <Text className="text-base text-gray-500 mb-6">
        Build an itinerary and map out your upcoming travel plans
      </Text>

      {/* Where to Input */}
      <TouchableOpacity
        onPress={() => setSearchVisible(true)}
        className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
      >
        <Text className="text-sm font-semibold text-gray-700 mb-1">
          Where to?
        </Text>
        <Text className="text-base text-gray-500">
          {chosenLocation || "e.g., Paris, Hawaii, Japan"}
        </Text>
      </TouchableOpacity>

      {/* Date Inputs */}
      <TouchableOpacity
        className="flex-row border border-gray-300 rounded-xl px-4 py-3 justify-between mb-4"
        onPress={() => setCalendarVisible(true)}
      >
        <View className="flex-1 mr-2">
          <Text className="text-sm font-semibold text-gray-700 mb-1">
            Dates (optional)
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="calendar" size={16} color="#666" className="mr-1" />
            <Text className="text-sm text-gray-500">
              {displayStart
                ? dayjs(displayStart).format("MMM D")
                : "Start date"}
            </Text>
          </View>
        </View>
        <View className="flex-1 ml-2">
          <Text className="text-sm font-semibold text-gray-700 mb-1 invisible">
            .
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="calendar" size={16} color="#666" className="mr-1" />
            <Text className="text-sm text-gray-500">
              {displayEnd ? dayjs(displayEnd).format("MMM D") : "End date"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Invite & Friends */}
      <View className="flex-row justify-between items-center mb-8">
        <TouchableOpacity>
          <Text className="text-sm text-gray-600 font-medium">
            + Invite a tripmate
          </Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center">
          <Ionicons name="people" size={16} color="#666" />
          <Text className="ml-1 text-sm text-gray-600 font-medium">
            Friends
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color="#666"
            className="ml-1"
          />
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {error && (
        <Text className="text-red-500 text-sm mb-4">{error}</Text>
      )}

      {/* Start Planning Button */}
      <TouchableOpacity
        onPress={handleCreateTrip}
        className="bg-orange-500 rounded-full py-3 items-center mb-4"
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text className="text-white font-semibold text-base">
            Start planning
          </Text>
        )}
      </TouchableOpacity>

      {/* Example Link */}
      <Text className="text-sm text-gray-500 text-center">
        Or see an example for{" "}
        <Text className="font-semibold text-gray-600">New York</Text>
      </Text>

      {/* Calendar Modal */}
      <Modal animationType="slide" transparent visible={calendarVisible}>
        <View className="flex-1 justify-center items-center bg-black/60">
          <View className="bg-white rounded-2xl w-11/12">
            <Calendar
              markingType={"period"}
              markedDates={getMarkedDates()}
              onDayPress={handleDayPress}
              minDate={today}
              theme={{
                todayTextColor: "#FF5722",
                arrowColor: "#00BFFF",
                selectedDayTextColor: "#fff",
              }}
            />
            <Pressable
              className="p-4 border-t border-gray-200 items-center"
              onPress={onSaveDates}
            >
              <Text className="text-gray-700 font-semibold">Save</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Search Overlay Modal */}
      <Modal animationType="fade" visible={searchVisible}>
        <SafeAreaView className="flex-1 bg-white pt-10 px-4">
          {/* Header */}
          <View className="flex-row items-center mb-4">
            <TouchableOpacity
              onPress={() => setSearchVisible(false)}
              className="mr-3"
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900">
              Search for a place
            </Text>
          </View>

          {/* Google Places Autocomplete */}
          <GooglePlacesAutocomplete
            placeholder="Search for a place"
            fetchDetails={true}
            enablePoweredByContainer={false}
            onPress={(data, details = null) => {
              if (data?.description) {
                setChosenLocation(data.description);
              }
              setSearchVisible(false);
            }}
            query={{
              key: GOOGLE_API_KEY,
              language: "en",
            }}
            styles={{
              container: {
                flex: 0,
              },
              textInputContainer: {
                flexDirection: "row",
                backgroundColor: "#f1f1f1",
                borderRadius: 30,
                paddingHorizontal: 10,
                alignItems: "center",
              },
              textInput: {
                flex: 1,
                height: 44,
                color: "#333",
                fontSize: 16,
                backgroundColor: "#f1f1f1",
                borderRadius: 25,
              },
              listView: {
                marginTop: 10,
                backgroundColor: "#fff",
              },
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default NewTripScreen;

